/**
 * Central configuration loaded from environment variables.
 * Registered in AppModule via ConfigModule.forRoot({ load: [configuration] }).
 * Read anywhere with ConfigService, e.g. config.get('s3.bucket').
 */

const toInt = (value: string | undefined, fallback: number): number => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true' || value === '1';
};

export default () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: toInt(process.env.PORT, 3000),
    uploadMaxBytes: toInt(process.env.UPLOAD_MAX_MB, 25) * 1024 * 1024,
  },
  redis: {
    // In the cloud (e.g. Upstash) set REDIS_URL to a rediss://... URL (TLS).
    // Locally, leave REDIS_URL blank and use host/port.
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    eventsQueue: process.env.RABBITMQ_EVENTS_QUEUE ?? 'ecommerce_events',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || undefined, // blank => real AWS S3
    forcePathStyle: toBool(process.env.S3_FORCE_PATH_STYLE, true),
    region: process.env.AWS_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'product-uploads',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
  mail: {
    host: process.env.MAIL_HOST || undefined, // blank => Ethereal test inbox
    port: toInt(process.env.MAIL_PORT, 587),
    secure: toBool(process.env.MAIL_SECURE, false),
    user: process.env.MAIL_USER || undefined,
    password: process.env.MAIL_PASSWORD || undefined,
    from: process.env.MAIL_FROM ?? 'E-commerce Processor <no-reply@example.com>',
  },
  processing: {
    concurrency: toInt(process.env.PROCESSING_CONCURRENCY, 5),
    dbChunkSize: toInt(process.env.PROCESSING_DB_CHUNK_SIZE, 500),
    maxAttempts: toInt(process.env.PROCESSING_MAX_ATTEMPTS, 3),
  },
});
