import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import type { MediaAssetRepository } from './repositories/media-asset.repository.js';
import type { StorageProviderRegistry } from './providers/storage-provider.registry.js';
import type { IStorageProvider } from './interfaces/storage-provider.interface.js';
import { MediaFacadeService } from './media-facade.service.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

describe('MediaFacadeService', () => {
  const uploadedBy = new Types.ObjectId();
  const companyId = new Types.ObjectId();
  const assetId = new Types.ObjectId().toString();
  const makeAsset = (
    status: 'PENDING' | 'ACTIVE' | 'DELETED' = 'PENDING',
  ): MediaAssetDocument =>
    ({
      id: assetId,
      uploadedBy,
      companyId,
      provider: 'aws-s3',
      storageKey: `tenants/${companyId.toString()}/employee_picture/${assetId}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 1200,
      purpose: 'EMPLOYEE_PICTURE',
      status,
    }) as unknown as MediaAssetDocument;
  const asset = makeAsset();
  const mediaAssetRepository = {
    createPending: vi.fn(),
    findById: vi.fn(),
    markActive: vi.fn(),
    markDeleted: vi.fn(),
  };
  const activeProvider = {
    providerName: 'aws-s3',
    createPresignedUploadUrl: vi.fn(),
    verifyObjectExists: vi.fn(),
  };
  const storageProviderRegistry = {
    get: vi.fn(),
  };
  const eventEmitter = { emit: vi.fn() };
  let service: MediaFacadeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mediaAssetRepository.createPending.mockResolvedValue(asset);
    mediaAssetRepository.findById.mockResolvedValue(asset);
    mediaAssetRepository.markActive.mockResolvedValue(makeAsset('ACTIVE'));
    mediaAssetRepository.markDeleted.mockResolvedValue(makeAsset('DELETED'));
    activeProvider.createPresignedUploadUrl.mockImplementation(
      async ({ storageKey, expiresInSeconds }) => ({
        uploadUrl: 'https://storage.example/upload',
        storageKey,
        expiresInSeconds,
      }),
    );
    activeProvider.verifyObjectExists.mockResolvedValue(true);
    storageProviderRegistry.get.mockReturnValue(activeProvider);

    service = new MediaFacadeService(
      mediaAssetRepository as unknown as MediaAssetRepository,
      storageProviderRegistry as unknown as StorageProviderRegistry,
      activeProvider as unknown as IStorageProvider,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('creates a tenant-scoped pending asset and a five-minute upload URL', async () => {
    const result = await service.createPresignedUpload(
      uploadedBy.toString(),
      companyId.toString(),
      {
        mimeType: 'image/jpeg',
        sizeBytes: 1200,
        purpose: 'EMPLOYEE_PICTURE',
      },
    );

    expect(result).toMatchObject({
      assetId,
      uploadUrl: 'https://storage.example/upload',
      expiresInSeconds: 300,
    });
    expect(result.storageKey).toMatch(
      new RegExp(
        `^tenants/${companyId.toString()}/employee_picture/[\\w-]+\\.jpg$`,
      ),
    );
    expect(mediaAssetRepository.createPending).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        uploadedBy,
        provider: 'aws-s3',
        storageKey: result.storageKey,
      }),
    );
    expect(activeProvider.createPresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: result.storageKey,
        sizeBytes: 1200,
        expiresInSeconds: 300,
      }),
    );
  });

  it('rejects unsupported MIME types before contacting storage', async () => {
    await expect(
      service.createPresignedUpload(uploadedBy.toString(), null, {
        mimeType: 'image/svg+xml',
        sizeBytes: 1200,
        purpose: 'USER_AVATAR',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(activeProvider.createPresignedUploadUrl).not.toHaveBeenCalled();
    expect(mediaAssetRepository.createPending).not.toHaveBeenCalled();
  });

  it('rejects committing an asset from another tenant', async () => {
    await expect(
      service.commitAsset(
        assetId,
        uploadedBy.toString(),
        undefined,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(activeProvider.verifyObjectExists).not.toHaveBeenCalled();
    expect(mediaAssetRepository.markActive).not.toHaveBeenCalled();
  });

  it('emits cloud deletion after marking an asset deleted', async () => {
    const activeAsset = makeAsset('ACTIVE');
    const deletedAsset = makeAsset('DELETED');
    mediaAssetRepository.findById.mockResolvedValue(activeAsset);
    mediaAssetRepository.markDeleted.mockResolvedValue(deletedAsset);

    await service.deleteAsset(assetId);

    expect(mediaAssetRepository.markDeleted).toHaveBeenCalledWith(assetId, undefined);
    expect(eventEmitter.emit).toHaveBeenCalledWith('media.asset_deleted', {
      provider: 'aws-s3',
      storageKey: activeAsset.storageKey,
    });
  });
});
