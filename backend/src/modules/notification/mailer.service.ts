import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/**
 * Sends email via Nodemailer.
 * - If MAIL_HOST is configured -> uses that real SMTP server.
 * - Otherwise (local dev) -> auto-creates a free Ethereal test inbox and logs
 *   a clickable preview URL for every message. No account/setup needed.
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter!: nodemailer.Transporter;
  private usingEthereal = false;
  private from!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.from = this.config.get<string>('mail.from')!;
    const host = this.config.get<string>('mail.host');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port'),
        secure: this.config.get<boolean>('mail.secure'),
        auth: {
          user: this.config.get<string>('mail.user'),
          pass: this.config.get<string>('mail.password'),
        },
      });
      this.logger.log(`Mailer using SMTP host ${host}`);
    } else {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.usingEthereal = true;
      this.logger.log(
        'Mailer using Ethereal test inbox (dev). Preview URLs are logged per email.',
      );
    }
  }

  async sendMail(opts: {
    to: string;
    subject: string;
    html: string;
    attachments?: MailAttachment[];
  }): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });

    if (this.usingEthereal) {
      const url = nodemailer.getTestMessageUrl(info);
      this.logger.log(`Email sent to ${opts.to}. Preview: ${url}`);
    } else {
      this.logger.log(`Email sent to ${opts.to} (id: ${info.messageId})`);
    }
  }
}
