export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface UploadBatch {
  id: string;
  fileName: string;
  userEmail: string;
  status: BatchStatus;
  totalRows: number;
  successCount: number;
  failedCount: number;
  errorFileKey: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  category: string;
  color: string;
  stock: number;
  deletedAt: string | null;
  createdAt: string;
}

export interface ProductList {
  total: number;
  items: Product[];
}
