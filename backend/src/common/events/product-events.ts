/** Typed payloads carried by RabbitMQ events. */

export interface FileUploadedEvent {
  batchId: string;
  fileKey: string;
  fileName: string;
  userEmail: string;
}

export interface FileProcessedEvent {
  batchId: string;
  userEmail: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  errorFileKey: string | null;
}
