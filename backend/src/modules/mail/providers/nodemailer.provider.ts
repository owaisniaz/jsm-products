import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type {
  IMailProvider,
  SendMailOptions,
} from '../interfaces/mail-provider.interface.js';

@Injectable()
export class NodemailerProvider implements IMailProvider, OnModuleInit {
  private readonly logger = new Logger(NodemailerProvider.name);
  private transporter: Transporter | null = null;
  private fromAddress = '';
  private isEthereal = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const environment = this.config.get<string>('NODE_ENV');

    if (!host) {
      if (environment === 'production') {
        throw new Error('SMTP_HOST is required when using Nodemailer in production');
      }
      const account = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      });
      this.fromAddress = this.config.get<string>('MAIL_FROM') ?? account.user;
      this.isEthereal = true;
      this.logger.log('Using an Ethereal test account for development email.');
      return;
    }

    const username = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASS');
    if ((username && !password) || (!username && password)) {
      throw new Error('SMTP_USER and SMTP_PASS must be configured together');
    }

    const port = this.config.get<number>('SMTP_PORT') ?? 587;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(username && password
        ? { auth: { user: username, pass: password } }
        : {}),
    });
    this.fromAddress =
      this.config.get<string>('MAIL_FROM') ?? username ?? 'no-reply@example.com';
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('Nodemailer transport has not been initialized');
    }

    const info = await this.transporter.sendMail({
      from: this.fromAddress,
      ...options,
    });
    if (this.isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`Ethereal email preview: ${previewUrl}`);
      }
    }
  }
}
