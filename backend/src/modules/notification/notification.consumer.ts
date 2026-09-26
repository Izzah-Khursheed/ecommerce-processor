import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { EVENTS } from '../../common/constants';
import { FileProcessedEvent } from '../../common/events/product-events';
import { MailerService, MailAttachment } from './mailer.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { buildResultEmail } from './email-template';

/**
 * Reacts to "product.file.processed" and emails the user a summary,
 * the required format, and (if any) the error sheet as an attachment.
 */
@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly s3: S3Service,
  ) {}

  @EventPattern(EVENTS.FILE_PROCESSED)
  async onFileProcessed(
    @Payload() data: FileProcessedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    this.logger.log(`Emailing results for batch ${data.batchId} to ${data.userEmail}`);

    const attachments: MailAttachment[] = [];
    if (data.errorFileKey) {
      const buffer = await this.s3.getObject(data.errorFileKey);
      attachments.push({
        filename: 'unsuccessful-rows.xlsx',
        content: buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    await this.mailer.sendMail({
      to: data.userEmail,
      subject: `Product upload processed: ${data.successCount} succeeded, ${data.failedCount} failed`,
      html: buildResultEmail(data),
      attachments,
    });

    const channel = context.getChannelRef();
    channel.ack(context.getMessage());
  }
}
