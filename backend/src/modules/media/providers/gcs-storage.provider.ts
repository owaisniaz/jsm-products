import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  CreatePresignedUploadUrlParams,
  IStorageProvider,
  PresignedUploadResult,
} from '../interfaces/storage-provider.interface.js';

@Injectable()
export class GcsStorageProvider implements IStorageProvider {
  readonly providerName = 'gcs';

  async createPresignedUploadUrl(
    _params: CreatePresignedUploadUrlParams,
  ): Promise<PresignedUploadResult> {
    throw this.notConfigured();
  }

  async createPresignedReadUrl(
    _storageKey: string,
    _expiresInSeconds?: number,
  ): Promise<string> {
    throw this.notConfigured();
  }

  async verifyObjectExists(_storageKey: string): Promise<boolean> {
    throw this.notConfigured();
  }

  async deleteObject(_storageKey: string): Promise<void> {
    throw this.notConfigured();
  }

  resolvePublicUrl(_storageKey: string): string {
    throw this.notConfigured();
  }

  private notConfigured(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'The GCS adapter is a stub and has no cloud client configured',
    );
  }
}
