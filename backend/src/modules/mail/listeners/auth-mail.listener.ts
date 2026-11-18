import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  MAIL_PROVIDER_TOKEN,
  type IMailProvider,
} from '../interfaces/mail-provider.interface.js';

interface PasswordResetOtpRequested {
  email: string;
  rawOtp: string;
  expiresInMinutes: number;
}

@Injectable()
export class AuthMailListener {
  private readonly logger = new Logger(AuthMailListener.name);

  constructor(
    @Inject(MAIL_PROVIDER_TOKEN)
    private readonly mailProvider: IMailProvider,
  ) {}

  @OnEvent('auth.password_reset_otp_requested')
  async sendPasswordResetOtp(
    event: PasswordResetOtpRequested,
  ): Promise<void> {
    await this.mailProvider.sendMail({
      to: event.email,
      subject: 'Your password reset code',
      text: `Your password reset code is ${event.rawOtp}. It expires in ${event.expiresInMinutes} minutes.`,
      html: `<div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
        <div style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
          <h1 style="margin:0 0 16px;font-size:22px">Reset your password</h1>
          <p style="margin:0 0 24px;line-height:1.6">Use this verification code to reset your password:</p>
          <p style="margin:0 0 24px;padding:16px;text-align:center;background:#f1f5f9;border-radius:8px;font-size:32px;font-weight:700;letter-spacing:8px">${event.rawOtp}</p>
          <p style="margin:0;color:#475569;line-height:1.6">This code expires in ${event.expiresInMinutes} minutes. If you did not request a password reset, you can ignore this email.</p>
        </div>
      </div>`,
    });
    this.logger.log('Password reset email sent.');
  }
}
