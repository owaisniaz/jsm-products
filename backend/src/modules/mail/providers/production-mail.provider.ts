import type {
  IMailProvider,
  SendMailOptions,
} from '../interfaces/mail-provider.interface.js';

/**
 * Adapter boundary for a production provider such as AWS SES, Resend, or SendGrid.
 * Replace this implementation with the chosen provider's SDK without changing consumers.
 */
export class ProductionMailProvider implements IMailProvider {
  async sendMail(_options: SendMailOptions): Promise<void> {
    throw new Error(
      'Production mail is not configured. Install and configure a production mail adapter.',
    );
  }
}
