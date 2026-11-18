import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSecurityModule } from '../../auth/auth-security.module.js';
import {
  STORAGE_PROVIDER_TOKEN,
  STORAGE_PROVIDERS_TOKEN,
} from './interfaces/storage-provider.interface.js';
import { MediaController } from './media.controller.js';
import { MediaFacadeService } from './media-facade.service.js';
import { MediaDeletedListener } from './listeners/media-deleted.listener.js';
import { MediaAssetRepository } from './repositories/media-asset.repository.js';
import {
  MediaAsset,
  MediaAssetSchema,
} from './schemas/media-asset.schema.js';
import { GcsStorageProvider } from './providers/gcs-storage.provider.js';
import { S3StorageProvider } from './providers/s3-storage.provider.js';
import { StorageProviderRegistry } from './providers/storage-provider.registry.js';
import type { IStorageProvider } from './interfaces/storage-provider.interface.js';

@Global()
@Module({
  imports: [
    ConfigModule,
    AuthSecurityModule,
    MongooseModule.forFeature([
      { name: MediaAsset.name, schema: MediaAssetSchema },
    ]),
  ],
  controllers: [MediaController],
  providers: [
    S3StorageProvider,
    GcsStorageProvider,
    {
      provide: STORAGE_PROVIDERS_TOKEN,
      inject: [S3StorageProvider, GcsStorageProvider],
      useFactory: (
        s3Provider: S3StorageProvider,
        gcsProvider: GcsStorageProvider,
      ): readonly IStorageProvider[] => [s3Provider, gcsProvider],
    },
    StorageProviderRegistry,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      inject: [ConfigService, S3StorageProvider, GcsStorageProvider],
      useFactory: (
        config: ConfigService,
        s3Provider: S3StorageProvider,
        gcsProvider: GcsStorageProvider,
      ): IStorageProvider => {
        const driver = config.get<string>('STORAGE_DRIVER') ?? 's3';
        if (driver === 's3') return s3Provider;
        if (driver === 'gcs') return gcsProvider;
        throw new Error(`Unsupported STORAGE_DRIVER "${driver}"`);
      },
    },
    MediaAssetRepository,
    MediaFacadeService,
    MediaDeletedListener,
  ],
  exports: [MediaFacadeService],
})
export class MediaModule {}
