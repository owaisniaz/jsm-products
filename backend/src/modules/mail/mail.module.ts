import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthMailListener } from './listeners/auth-mail.listener.js';
import { MAIL_PROVIDER_TOKEN } from './interfaces/mail-provider.interface.js';
import { NodemailerProvider } from './providers/nodemailer.provider.js';
import { ProductionMailProvider } from './providers/production-mail.provider.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAIL_PROVIDER_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver =
          config.get<string>('MAIL_DRIVER') ??
          (config.get<string>('NODE_ENV') === 'production'
            ? 'production'
            : 'nodemailer');
        return driver === 'production'
          ? new ProductionMailProvider()
          : new NodemailerProvider(config);
      },
    },
    AuthMailListener,
  ],
  exports: [MAIL_PROVIDER_TOKEN],
})
export class MailModule {}
