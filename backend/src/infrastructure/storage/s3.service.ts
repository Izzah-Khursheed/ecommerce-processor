import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * Thin wrapper over the AWS S3 SDK.
 * The SAME code talks to real AWS S3 (prod) or MinIO (local dev) — the only
 * difference is the `endpoint` from config (blank => real AWS).
 */
@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('s3.endpoint');
    this.bucket = this.config.get<string>('s3.bucket')!;

    this.client = new S3Client({
      region: this.config.get<string>('s3.region'),
      endpoint, // undefined => AWS default endpoints
      forcePathStyle: this.config.get<boolean>('s3.forcePathStyle'), // required for MinIO
      credentials: {
        accessKeyId: this.config.get<string>('s3.accessKeyId')!,
        secretAccessKey: this.config.get<string>('s3.secretAccessKey')!,
      },
    });
  }

  /** Make sure the bucket exists (mainly a convenience for local MinIO). */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 bucket "${this.bucket}" is ready`);
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created S3 bucket "${this.bucket}"`);
      } catch (err) {
        this.logger.warn(
          `Could not verify/create bucket "${this.bucket}". ` +
            `Ensure it exists. Reason: ${(err as Error).message}`,
        );
      }
    }
  }

  /** Upload a buffer; returns the object key. */
  async putObject(
    key: string,
    body: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.debug(`Uploaded s3://${this.bucket}/${key}`);
    return key;
  }

  /** Download an object into a Buffer. */
  async getObject(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
