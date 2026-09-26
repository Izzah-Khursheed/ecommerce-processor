import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

type Mode = 'brevo-api' | 'smtp' | 'ethereal';

/**
 * Sends email in one of three modes, chosen automatically:
 *
 *  1. BREVO_API_KEY set  -> Brevo HTTP API (port 443). USE THIS in the cloud —
 *     hosts like Render block outbound SMTP ports, so SMTP silently fails there.
 *  2. MAIL_HOST set      -> classic SMTP via Nodemailer (works locally).
 *  3. neither            -> free Ethereal test inbox (local dev; preview URL logged).
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private mode: Mode = 'ethereal';
  private transporter?: nodemailer.Transporter;
  private from!: string; // raw "Name <email>"
  private senderName = 'Product Processor';
  private senderEmail = 'no-reply@example.com';
  private brevoApiKey?: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.from = this.config.get<string>('mail.from')!;
    this.parseFrom(this.from);
    this.brevoApiKey = this.config.get<string>('mail.brevoApiKey');
    const host = this.config.get<string>('mail.host');

    if (this.brevoApiKey) {
      this.mode = 'brevo-api';
      this.logger.log('Mailer using Brevo HTTP API (recommended for cloud hosts)');
      return;
    }

    if (host) {
      this.mode = 'smtp';
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
      return;
    }

    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    this.mode = 'ethereal';
    this.logger.log('Mailer using Ethereal test inbox (dev). Preview URLs are logged per email.');
  }

  async sendMail(opts: {
    to: string;
    subject: string;
    html: string;
    attachments?: MailAttachment[];
  }): Promise<void> {
    if (this.mode === 'brevo-api') {
      await this.sendViaBrevoApi(opts);
      return;
    }

    const info = await this.transporter!.sendMail({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });

    if (this.mode === 'ethereal') {
      this.logger.log(`Email sent to ${opts.to}. Preview: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      this.logger.log(`Email sent to ${opts.to} (id: ${info.messageId})`);
    }
  }

  /** Send via Brevo's transactional email HTTP API (works where SMTP is blocked). */
  private async sendViaBrevoApi(opts: {
    to: string;
    subject: string;
    html: string;
    attachments?: MailAttachment[];
  }): Promise<void> {
    const body: Record<string, unknown> = {
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
    };
    if (opts.attachments?.length) {
      body.attachment = opts.attachments.map((a) => ({
        name: a.filename,
        content: a.content.toString('base64'),
      }));
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.brevoApiKey!,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Brevo API send failed (${res.status}): ${text}`);
    }
    const data: any = await res.json().catch(() => ({}));
    this.logger.log(
      `Email sent to ${opts.to} via Brevo API (messageId: ${data?.messageId ?? 'n/a'})`,
    );
  }

  /** Parse `MAIL_FROM` ("Name <email>" or "email") into name + email. */
  private parseFrom(from: string): void {
    const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (m) {
      if (m[1]) this.senderName = m[1];
      this.senderEmail = m[2].trim();
    } else if (from.includes('@')) {
      this.senderEmail = from.trim();
    }
  }
}
