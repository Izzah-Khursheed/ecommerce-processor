import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EVENTS, QUEUES, JOBS } from '../../common/constants';
import { FileUploadedEvent } from '../../common/events/product-events';

/**
 * The bridge between RabbitMQ (events) and BullMQ (jobs).
 *
 * When the upload API announces "product.file.uploaded" on RabbitMQ, this
 * consumer reacts by enqueueing a BullMQ job so the heavy work runs reliably
 * in the background (with retries/concurrency). This is the teaching point:
 * RabbitMQ = "it happened", BullMQ = "now do the work".
 */
@Controller()
export class ProcessingConsumer {
  private readonly logger = new Logger(ProcessingConsumer.name);

  constructor(
    @InjectQueue(QUEUES.PRODUCT_PROCESSING) private readonly queue: Queue,
  ) {}

  @EventPattern(EVENTS.FILE_UPLOADED)
  async onFileUploaded(
    @Payload() data: FileUploadedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    this.logger.log(
      `Event ${EVENTS.FILE_UPLOADED} received for batch ${data.batchId}; enqueueing job`,
    );

    await this.queue.add(JOBS.PROCESS_FILE, data, {
      jobId: data.batchId, // idempotent: same batch won't be double-queued
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });

    // Acknowledge the RabbitMQ message so it isn't redelivered.
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }
}
