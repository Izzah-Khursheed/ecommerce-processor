/**
 * Shared names/tokens used across modules.
 * Keeping them in one place avoids typos between emitters and consumers.
 */

// RabbitMQ ClientProxy injection token (used to EMIT events).
export const EVENT_BUS = 'EVENT_BUS';

// RabbitMQ event patterns (the "something happened" announcements).
export const EVENTS = {
  FILE_UPLOADED: 'product.file.uploaded',
  FILE_PROCESSED: 'product.file.processed',
} as const;

// BullMQ queue + job names (the "do the heavy work" jobs).
export const QUEUES = {
  PRODUCT_PROCESSING: 'product-processing',
} as const;

export const JOBS = {
  PROCESS_FILE: 'process-file',
} as const;

// The exact columns the system accepts in the uploaded Excel sheet.
export const REQUIRED_COLUMNS = [
  'sku',
  'name',
  'description',
  'price',
  'category',
  'color',
  'stock',
] as const;
