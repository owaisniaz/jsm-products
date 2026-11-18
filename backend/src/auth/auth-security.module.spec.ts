import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthSecurityModule } from './auth-security.module.js';

describe('AuthSecurityModule', () => {
  it('resolves AccessTokenGuard and its dependencies in an importing module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthSecurityModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        getOrThrow: (key: string) => {
          const values: Record<string, string | number> = {
            JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough',
            JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough',
            JWT_ACCESS_TTL_SECONDS: 900,
            JWT_REFRESH_TTL_SECONDS: 604800,
            NODE_ENV: 'test',
          };
          return values[key];
        },
      })
      .compile();

    expect(moduleRef.get(AccessTokenGuard)).toBeInstanceOf(AccessTokenGuard);
    await moduleRef.close();
  });
});
