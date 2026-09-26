import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { EVENT_BUS, EVENTS } from '../../common/constants';
import { emitEvent } from '../../common/utils/emit-event.util';
import { FileUploadedEvent } from '../../common/events/product-events';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly config: ConfigService,
    @Inject(EVENT_BUS) private readonly eventBus: ClientProxy,
  ) {}

  async onModuleInit(): Promise<void> {
    // Connect the RabbitMQ client up front so the first emit is fast.
    await this.eventBus.connect();
  }

  /**
   * Store the uploaded file in S3, create a PENDING batch record, and
   * announce it on RabbitMQ. Returns immediately (the heavy work is async).
   */
  async handleUpload(
    file: Express.Multer.File | undefined,
    email: string,
  ): Promise<{ batchId: string; status: string; message: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded. Send it as form field "file".');
    }

    const isXlsx =
      file.mimetype === XLSX_MIME ||
      file.originalname.toLowerCase().endsWith('.xlsx');
    if (!isXlsx) {
      throw new BadRequestException('Only .xlsx Excel files are accepted.');
    }

    const maxBytes = this.config.get<number>('app.uploadMaxBytes')!;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File too large. Max ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`,
      );
    }

    // 1) Store the raw file in S3/MinIO.
    const batchId = randomUUID();
    const safeName = file.originalname.replace(/[^\w.\-]+/g, '_');
    const fileKey = `uploads/${batchId}/${safeName}`;
    await this.s3.putObject(fileKey, file.buffer, XLSX_MIME);

    // 2) Record the batch as PENDING.
    await this.prisma.uploadBatch.create({
      data: {
        id: batchId,
        fileKey,
        fileName: file.originalname,
        userEmail: email,
        status: 'PENDING',
      },
    });

    // 3) Announce it — a consumer will enqueue the processing job.
    const payload: FileUploadedEvent = {
      batchId,
      fileKey,
      fileName: file.originalname,
      userEmail: email,
    };
    await emitEvent(this.eventBus, EVENTS.FILE_UPLOADED, payload);

    this.logger.log(`Accepted upload; batch ${batchId} for ${email}`);
    return {
      batchId,
      status: 'accepted',
      message:
        'File received. It is being processed in the background; you will get an email with the results.',
    };
  }
}
