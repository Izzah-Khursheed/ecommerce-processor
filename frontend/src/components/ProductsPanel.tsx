import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import type { Product } from '../types';

export function ProductsPanel() {
  const [active, setActive] = useState<Product[]>([]);
  const [deleted, setDeleted] = useState<Product[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, d] = await Promise.all([api.getProducts(), api.getDeletedProducts()]);
      setActive(a.items);
      setActiveTotal(a.total);
      setDeleted(d.items);
      setDeletedTotal(d.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(id: string) {
    await api.deleteProduct(id);
    await load();
  }
  async function onRestore(id: string) {
    await api.restoreProduct(id);
    await load();
  }

  function meta(p: Product) {
    return (
      <div className="chips">
        <span className="chip"><b>{p.category}</b></span>
        <span className="chip">{p.color}</span>
        <span className="chip">Stock: <b>{p.stock}</b></span>
      </div>
    );
  }

  return (
    <>
      {/* Active products */}
      <div className="card">
        <div className="panel-head">
          <h2>
            Active products <span className="count-badge">{activeTotal}</span>
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
            </svg>
            Refresh
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}
        {loading && (
          <div className="center" style={{ padding: 30 }}>
            <span className="spinner" style={{ color: 'var(--violet)' }} />
          </div>
        )}

        {!loading && active.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
              </svg>
            </div>
            <p>No products yet. Upload a file on the Upload tab to get started.</p>
          </div>
        )}

        {active.length > 0 && (
          <div className="products-grid">
            {active.map((p) => (
              <div className="product-card" key={p.id}>
                <div className="pc-top">
                  <span className="pc-name">{p.name}</span>
                  <span className="pc-price">${p.price}</span>
                </div>
                <span className="sku-chip">{p.sku}</span>
                {meta(p)}
                <div className="pc-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => onDelete(p.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deleted products */}
      <div className="card">
        <div className="panel-head">
          <h2>
            Deleted products <span className="count-badge">{deletedTotal}</span>
          </h2>
        </div>

        {!loading && deleted.length === 0 && (
          <p className="muted">No deleted products. Deleting a product above moves it here.</p>
        )}

        {deleted.length > 0 && (
          <div className="products-grid">
            {deleted.map((p) => (
              <div className="product-card is-deleted" key={p.id}>
                <div className="pc-top">
                  <span className="pc-name">{p.name}</span>
                  <span className="pc-price">${p.price}</span>
                </div>
                <span className="sku-chip">{p.sku}</span>
                {meta(p)}
                <div className="pc-actions">
                  <button className="btn btn-sm btn-success" onClick={() => onRestore(p.id)}>
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
