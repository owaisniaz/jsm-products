import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StorageProviderRegistry } from '../providers/storage-provider.registry.js';
import type { MediaAssetDeletedEvent } from '../events/media-asset-deleted.event.js';

@Injectable()
export class MediaDeletedListener {
  private readonly logger = new Logger(MediaDeletedListener.name);

  constructor(
    private readonly storageProviderRegistry: StorageProviderRegistry,
  ) {}

  @OnEvent('media.asset_deleted')
  async handle(event: MediaAssetDeletedEvent): Promise<void> {
    try {
      await this.storageProviderRegistry
        .get(event.provider)
        .deleteObject(event.storageKey);
    } catch (error: unknown) {
      const details =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(
        `Failed to delete media object ${event.storageKey} from ${event.provider}`,
        details,
      );
    }
  }
}
