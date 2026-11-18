import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { MediaAssetRepository } from './repositories/media-asset.repository.js';
import { StorageProviderRegistry } from './providers/storage-provider.registry.js';
import { STORAGE_PROVIDER_TOKEN } from './interfaces/storage-provider.interface.js';
import type { IStorageProvider } from './interfaces/storage-provider.interface.js';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_SIZE_BYTES,
} from './dtos/media.dto.js';
import type {
  MediaAssetDocument,
  MediaAssetPurpose,
} from './schemas/media-asset.schema.js';
import type { MediaAssetDeletedEvent } from './events/media-asset-deleted.event.js';

const EXTENSION_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const UPLOAD_URL_EXPIRY_SECONDS = 300;

export interface CreateMediaUploadParams {
  mimeType: string;
  sizeBytes: number;
  purpose: MediaAssetPurpose;
}

@Injectable()
export class MediaFacadeService {
  private readonly logger = new Logger(MediaFacadeService.name);

  constructor(
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly storageProviderRegistry: StorageProviderRegistry,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly activeStorageProvider: IStorageProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPresignedUpload(
    uploadedBy: string,
    companyId: string | null,
    params: CreateMediaUploadParams,
  ) {
    this.validateUpload(params);
    const ownerObjectId = this.toObjectId(uploadedBy, 'uploadedBy');
    const companyObjectId =
      companyId === null ? null : this.toObjectId(companyId, 'companyId');
    const tenantKey = companyObjectId?.toString() ?? 'global';
    const extension = EXTENSION_BY_MIME_TYPE[params.mimeType];
    const storageKey = `tenants/${tenantKey}/${params.purpose.toLowerCase()}/${randomUUID()}.${extension}`;
    const signedUpload = await this.activeStorageProvider.createPresignedUploadUrl({
      storageKey,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      expiresInSeconds: UPLOAD_URL_EXPIRY_SECONDS,
    });
    const asset = await this.mediaAssetRepository.createPending({
      companyId: companyObjectId,
      uploadedBy: ownerObjectId,
      provider: this.activeStorageProvider.providerName,
      storageKey,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      purpose: params.purpose,
    });

    return {
      assetId: asset.id,
      uploadUrl: signedUpload.uploadUrl,
      storageKey: signedUpload.storageKey,
      expiresInSeconds: signedUpload.expiresInSeconds,
    };
  }

  async commitAsset(
    assetId: string,
    expectedOwnerId: string,
    session?: ClientSession,
    expectedCompanyId?: string | null,
  ): Promise<MediaAssetDocument> {
    const asset = await this.findAsset(assetId, session);
    this.assertOwner(asset, expectedOwnerId, expectedCompanyId);

    if (asset.status === 'ACTIVE') return asset;
    if (asset.status !== 'PENDING') {
      throw new BadRequestException('Media asset is not pending upload');
    }

    const provider = this.storageProviderRegistry.get(asset.provider);
    if (!(await provider.verifyObjectExists(asset.storageKey))) {
      throw new BadRequestException('Uploaded media object was not found');
    }

    const activeAsset = await this.mediaAssetRepository.markActive(
      assetId,
      session,
    );
    if (activeAsset) return activeAsset;

    const latestAsset = await this.findAsset(assetId, session);
    if (latestAsset.status === 'ACTIVE') return latestAsset;
    throw new ConflictException('Media asset status changed during commit');
  }

  async replaceAsset(
    oldAssetId: string,
    newAssetId: string,
    expectedOwnerId: string,
    session?: ClientSession,
  ): Promise<MediaAssetDocument> {
    const oldAsset = await this.findAsset(oldAssetId, session);
    this.assertOwner(oldAsset, expectedOwnerId);
    if (oldAsset.status !== 'ACTIVE') {
      throw new BadRequestException('Only an active media asset can be replaced');
    }
    if (oldAssetId === newAssetId) return oldAsset;

    const expectedCompanyId = oldAsset.companyId?.toString() ?? null;
    const newAsset = await this.commitAsset(
      newAssetId,
      expectedOwnerId,
      session,
      expectedCompanyId,
    );
    const deletedAsset = await this.mediaAssetRepository.markDeleted(
      oldAssetId,
      session,
    );
    if (!deletedAsset) {
      throw new ConflictException('Old media asset status changed during replace');
    }
    this.publishDeletion(deletedAsset, session);
    return newAsset;
  }

  async deleteAsset(
    assetId: string,
    session?: ClientSession,
  ): Promise<void> {
    const asset = await this.findAsset(assetId, session);
    if (asset.status === 'DELETED') return;

    const deletedAsset = await this.mediaAssetRepository.markDeleted(
      assetId,
      session,
    );
    if (!deletedAsset) {
      const latestAsset = await this.findAsset(assetId, session);
      if (latestAsset.status === 'DELETED') return;
      throw new ConflictException('Media asset status changed during delete');
    }
    this.publishDeletion(deletedAsset, session);
  }

  async deleteOwnedAsset(
    assetId: string,
    expectedOwnerId: string,
    expectedCompanyId: string | null,
  ): Promise<void> {
    const asset = await this.findAsset(assetId);
    this.assertOwner(asset, expectedOwnerId, expectedCompanyId);
    await this.deleteAsset(assetId);
  }

  async resolveAssetUrl(
    assetId: string,
  ): Promise<{ assetId: string; url: string }> {
    const asset = await this.findAsset(assetId);
    if (asset.status !== 'ACTIVE') {
      throw new NotFoundException('Active media asset was not found');
    }
    const provider = this.storageProviderRegistry.get(asset.provider);
    return {
      assetId: asset.id,
      url: provider.resolvePublicUrl(asset.storageKey),
    };
  }

  private async findAsset(
    assetId: string,
    session?: ClientSession,
  ): Promise<MediaAssetDocument> {
    if (!Types.ObjectId.isValid(assetId)) {
      throw new BadRequestException('Invalid media asset ID');
    }
    const asset = await this.mediaAssetRepository.findById(assetId, session);
    if (!asset) throw new NotFoundException('Media asset was not found');
    return asset;
  }

  private assertOwner(
    asset: MediaAssetDocument,
    expectedOwnerId: string,
    expectedCompanyId?: string | null,
  ): void {
    if (asset.uploadedBy.toString() !== expectedOwnerId) {
      throw new ForbiddenException('Media asset does not belong to this user');
    }
    if (
      expectedCompanyId !== undefined &&
      asset.companyId?.toString() !== expectedCompanyId
    ) {
      throw new ForbiddenException('Media asset does not belong to this company');
    }
  }

  private validateUpload(params: CreateMediaUploadParams): void {
    if (
      !['USER_AVATAR', 'EMPLOYEE_PICTURE', 'COMPANY_LOGO', 'DOCUMENT'].includes(
        params.purpose,
      )
    ) {
      throw new BadRequestException('Unsupported media purpose');
    }
    if (!ALLOWED_MEDIA_MIME_TYPES.some((mimeType) => mimeType === params.mimeType)) {
      throw new BadRequestException('Unsupported media MIME type');
    }
    if (
      !Number.isInteger(params.sizeBytes) ||
      params.sizeBytes < 1 ||
      params.sizeBytes > MAX_MEDIA_SIZE_BYTES
    ) {
      throw new BadRequestException('Media file must be no larger than 5 MB');
    }
    if (!EXTENSION_BY_MIME_TYPE[params.mimeType]) {
      throw new BadRequestException('Unsupported media MIME type');
    }
  }

  private toObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return new Types.ObjectId(value);
  }

  private publishDeletion(
    asset: MediaAssetDocument,
    session?: ClientSession,
  ): void {
    const event: MediaAssetDeletedEvent = {
      provider: asset.provider,
      storageKey: asset.storageKey,
    };
    if (session?.inTransaction()) {
      // Avoid deleting cloud data if the surrounding MongoDB transaction aborts.
      session.once('ended', () => {
        void this.publishIfDeleted(asset.id, event);
      });
      return;
    }
    this.eventEmitter.emit('media.asset_deleted', event);
  }

  private async publishIfDeleted(
    assetId: string,
    event: MediaAssetDeletedEvent,
  ): Promise<void> {
    try {
      const asset = await this.mediaAssetRepository.findById(assetId);
      if (asset?.status === 'DELETED') {
        this.eventEmitter.emit('media.asset_deleted', event);
      }
    } catch (error: unknown) {
      const details =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(
        `Could not confirm committed deletion for media asset ${assetId}`,
        details,
      );
    }
  }
}
