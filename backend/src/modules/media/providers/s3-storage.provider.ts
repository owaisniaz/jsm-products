import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  CreatePresignedUploadUrlParams,
  IStorageProvider,
  PresignedUploadResult,
} from '../interfaces/storage-provider.interface.js';

const DEFAULT_EXPIRY_SECONDS = 300;
const MAX_EXPIRY_SECONDS = 3600;

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('AWS_S3_ENDPOINT');
    const forcePathStyle = config.get<string>('AWS_S3_FORCE_PATH_STYLE');
    this.client = new S3Client({
      region: config.get<string>('AWS_REGION') ?? 'us-east-1',
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle:
        forcePathStyle === undefined ? Boolean(endpoint) : forcePathStyle === 'true',
    });
  }

  get providerName(): string {
    return this.config.get<string>('AWS_S3_PROVIDER_NAME') ?? 'aws-s3';
  }

  async createPresignedUploadUrl(
    params: CreatePresignedUploadUrlParams,
  ): Promise<PresignedUploadResult> {
    const expiresInSeconds = this.getExpiry(params.expiresInSeconds);
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: params.storageKey,
        ContentType: params.mimeType,
        ContentLength: params.sizeBytes,
      }),
      { expiresIn: expiresInSeconds },
    );

    return {
      uploadUrl,
      storageKey: params.storageKey,
      expiresInSeconds,
    };
  }

  createPresignedReadUrl(
    storageKey: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: storageKey,
      }),
      { expiresIn: this.getExpiry(expiresInSeconds) },
    );
  }

  async verifyObjectExists(storageKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.getBucket(),
          Key: storageKey,
        }),
      );
      return true;
    } catch (error: unknown) {
      if (this.isNotFound(error)) return false;
      throw error;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: storageKey,
      }),
    );
  }

  resolvePublicUrl(storageKey: string): string {
    const encodedKey = this.encodeKey(storageKey);
    const cdnBaseUrl = this.config.get<string>('AWS_CDN_BASE_URL');
    if (cdnBaseUrl) {
      return `${cdnBaseUrl.replace(/\/+$/, '')}/${encodedKey}`;
    }

    const bucket = this.getBucket();
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    const regionalHost =
      region === 'us-east-1'
        ? `${bucket}.s3.amazonaws.com`
        : `${bucket}.s3.${region}.amazonaws.com`;
    return `https://${regionalHost}/${encodedKey}`;
  }

  private getBucket(): string {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) {
      throw new ServiceUnavailableException(
        'AWS_S3_BUCKET is not configured for the S3 storage provider',
      );
    }
    return bucket;
  }

  private getExpiry(expiresInSeconds?: number): number {
    const expiry = expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS;
    if (
      !Number.isInteger(expiry) ||
      expiry < 1 ||
      expiry > MAX_EXPIRY_SECONDS
    ) {
      throw new BadRequestException(
        `Presigned URL expiry must be between 1 and ${MAX_EXPIRY_SECONDS} seconds`,
      );
    }
    return expiry;
  }

  private encodeKey(storageKey: string): string {
    return storageKey.split('/').map(encodeURIComponent).join('/');
  }

  private isNotFound(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as {
      name?: unknown;
      $metadata?: { httpStatusCode?: unknown };
    };
    return (
      candidate.name === 'NotFound' ||
      candidate.name === 'NoSuchKey' ||
      candidate.$metadata?.httpStatusCode === 404
    );
  }
}
