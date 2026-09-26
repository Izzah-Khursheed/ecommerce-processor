import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Job } from 'bullmq';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { ExcelService, FailedRow } from './excel.service';
import { validateProductRow } from './dto/product-row.dto';
import { EVENT_BUS, EVENTS, QUEUES } from '../../common/constants';
import { emitEvent } from '../../common/utils/emit-event.util';
import { FileUploadedEvent, FileProcessedEvent } from '../../common/events/product-events';

const concurrency = Number(process.env.PROCESSING_CONCURRENCY) || 5;

/**
 * The heavy worker. Picks up a "process-file" job and runs the whole pipeline:
 * download -> read rows -> validate -> persist valid -> build error sheet ->
 * announce completion. BullMQ handles retries/concurrency for us.
 */
@Processor(QUEUES.PRODUCT_PROCESSING, { concurrency })
export class ProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly excel: ExcelService,
    private readonly config: ConfigService,
    @Inject(EVENT_BUS) private readonly eventBus: ClientProxy,
  ) {
    super();
  }

  async process(job: Job<FileUploadedEvent>): Promise<FileProcessedEvent> {
    const { batchId, fileKey, fileName, userEmail } = job.data;
    this.logger.log(`Processing batch ${batchId} (${fileName})`);

    await this.prisma.uploadBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' },
    });

    try {
      // 1) Download + parse.
      const buffer = await this.s3.getObject(fileKey);
      const rows = await this.excel.readRows(buffer);

      // 2) Validate each row; also dedupe SKUs within the file.
      const seenSkus = new Set<string>();
      const failed: FailedRow[] = [];
      const validRows: { sku: string; data: any }[] = [];

      for (const row of rows) {
        const result = validateProductRow(row.raw);
        if (!result.valid || !result.dto) {
          failed.push({ ...row, errors: result.errors });
          continue;
        }
        const dto = result.dto;
        if (seenSkus.has(dto.sku)) {
          failed.push({ ...row, errors: ['duplicate sku within this file'] });
          continue;
        }
        seenSkus.add(dto.sku);
        validRows.push({
          sku: dto.sku,
          data: {
            sku: dto.sku,
            name: dto.name,
            description: dto.description,
            price: dto.price,
            category: dto.category,
            color: dto.color,
            stock: dto.stock,
            batchId,
          },
        });
      }

      // 3) Reject SKUs that already exist in the catalog (excluding soft-deleted).
      const skus = validRows.map((v) => v.sku);
      const existing = skus.length
        ? await this.prisma.product.findMany({
            where: { sku: { in: skus }, deletedAt: null },
            select: { sku: true },
          })
        : [];
      const existingSet = new Set(existing.map((e) => e.sku));

      const toInsert = validRows.filter((v) => {
        if (existingSet.has(v.sku)) return false;
        return true;
      });
      for (const v of validRows) {
        if (existingSet.has(v.sku)) {
          const orig = rows.find((r) => String(r.raw.sku ?? '').trim() === v.sku)!;
          failed.push({ ...orig, errors: ['sku already exists in catalog'] });
        }
      }

      // 4) Insert valid products in chunks (cheaper than row-by-row).
      const chunkSize = this.config.get<number>('processing.dbChunkSize')!;
      let successCount = 0;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize).map((v) => v.data);
        const res = await this.prisma.product.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        successCount += res.count;
      }

      // 5) Build the error sheet (only if there were failures).
      let errorFileKey: string | null = null;
      if (failed.length > 0) {
        const errorBuffer = await this.excel.buildErrorWorkbook(failed);
        errorFileKey = `errors/${batchId}/unsuccessful-rows.xlsx`;
        await this.s3.putObject(
          errorFileKey,
          errorBuffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
      }

      const totalRows = rows.length;
      const failedCount = failed.length;

      // 6) Mark the batch complete.
      await this.prisma.uploadBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          totalRows,
          successCount,
          failedCount,
          errorFileKey,
        },
      });

      this.logger.log(
        `Batch ${batchId} done: total=${totalRows} success=${successCount} failed=${failedCount}`,
      );

      // 7) Announce completion -> the notification consumer will email the user.
      const processed: FileProcessedEvent = {
        batchId,
        userEmail,
        fileName,
        totalRows,
        successCount,
        failedCount,
        errorFileKey,
      };
      await emitEvent(this.eventBus, EVENTS.FILE_PROCESSED, processed);
      return processed;
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Batch ${batchId} failed: ${message}`);
      await this.prisma.uploadBatch.update({
        where: { id: batchId },
        data: { status: 'FAILED', errorMessage: message },
      });
      throw err; // let BullMQ retry per the configured attempts
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    this.logger.warn(
      `Job ${job.id} attempt ${job.attemptsMade} failed: ${err.message}`,
    );
  }
}
