export const STORAGE_PROVIDER_TOKEN = 'STORAGE_PROVIDER';
export const STORAGE_PROVIDERS_TOKEN = 'STORAGE_PROVIDERS';

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export interface CreatePresignedUploadUrlParams {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  expiresInSeconds?: number;
}

export interface IStorageProvider {
  readonly providerName: string;
  createPresignedUploadUrl(
    params: CreatePresignedUploadUrlParams,
  ): Promise<PresignedUploadResult>;
  createPresignedReadUrl(
    storageKey: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  verifyObjectExists(storageKey: string): Promise<boolean>;
  deleteObject(storageKey: string): Promise<void>;
  resolvePublicUrl(storageKey: string): string;
}
