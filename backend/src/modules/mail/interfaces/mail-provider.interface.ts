export const MAIL_PROVIDER_TOKEN = 'MAIL_PROVIDER';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IMailProvider {
  sendMail(options: SendMailOptions): Promise<void>;
}
