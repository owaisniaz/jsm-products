import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { STORAGE_PROVIDERS_TOKEN } from '../interfaces/storage-provider.interface.js';
import type { IStorageProvider } from '../interfaces/storage-provider.interface.js';

@Injectable()
export class StorageProviderRegistry {
  private readonly providersByName: ReadonlyMap<string, IStorageProvider>;

  constructor(
    @Inject(STORAGE_PROVIDERS_TOKEN)
    providers: readonly IStorageProvider[],
  ) {
    this.providersByName = new Map(
      providers.map((provider) => [provider.providerName, provider]),
    );
    if (this.providersByName.size !== providers.length) {
      throw new Error('Storage provider names must be unique');
    }
  }

  get(providerName: string): IStorageProvider {
    const provider = this.providersByName.get(providerName);
    if (!provider) {
      throw new InternalServerErrorException(
        `Storage provider "${providerName}" is not registered`,
      );
    }
    return provider;
  }
}
