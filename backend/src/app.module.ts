import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { DatabaseModule } from './database/database.module.js';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor.js';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config.schema.js';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IamModule } from './modules/iam/iam.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { HrModule } from './modules/hr/hr.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { MediaModule } from './modules/media/media.module.js';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: [
        process.env.NODE_ENV === 'production'
          ? '.env.stage.prod'
          : '.env.stage.dev',
      ],
      validate: validateEnv,
      isGlobal: true,
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'workspace',
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    CompaniesModule,
    IamModule,
    OrganizationModule,
    HrModule,
    MailModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },

    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // applies to all routes
  }
}
