import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProcessingProcessor } from './processing.processor';
import { ProcessingConsumer } from './processing.consumer';
import { ExcelService } from './excel.service';
import { QUEUES } from '../../common/constants';

/**
 * Owns the whole processing stage:
 *  - registers the BullMQ queue (with retries + backoff),
 *  - ProcessingConsumer: RabbitMQ event -> enqueue job,
 *  - ProcessingProcessor: the BullMQ worker that does the heavy lifting.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.PRODUCT_PROCESSING,
      defaultJobOptions: {
        attempts: Number(process.env.PROCESSING_MAX_ATTEMPTS) || 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
  ],
  controllers: [ProcessingConsumer],
  providers: [ProcessingProcessor, ExcelService],
})
export class ProcessingModule {}
