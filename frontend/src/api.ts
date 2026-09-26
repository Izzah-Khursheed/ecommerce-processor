import type { UploadBatch, ProductList, Product } from './types';

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3000';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async upload(file: File, email: string): Promise<UploadBatch & { batchId?: string }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('email', email);
    const res = await fetch(`${API_BASE}/uploads`, { method: 'POST', body: fd });
    return json(res);
  },

  async getBatch(id: string): Promise<UploadBatch> {
    return json(await fetch(`${API_BASE}/uploads/${id}`));
  },

  async getProducts(params: { category?: string } = {}): Promise<ProductList> {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    return json(await fetch(`${API_BASE}/products?${qs.toString()}`));
  },

  async getDeletedProducts(): Promise<ProductList> {
    return json(await fetch(`${API_BASE}/products/deleted`));
  },

  async deleteProduct(id: string): Promise<Product> {
    return json(await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' }));
  },

  async restoreProduct(id: string): Promise<Product> {
    return json(await fetch(`${API_BASE}/products/${id}/restore`, { method: 'POST' }));
  },

  errorFileUrl(id: string): string {
    return `${API_BASE}/uploads/${id}/errors`;
  },
};
