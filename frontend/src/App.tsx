import { useState } from 'react';
import { UploadPanel } from './components/UploadPanel';
import { ProductsPanel } from './components/ProductsPanel';
import { useTheme } from './useTheme';

type Tab = 'upload' | 'products';

export function App() {
  const [tab, setTab] = useState<Tab>('upload');
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="app-shell">
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="brand-badge">🛒</div>
            <div>
              <h1 className="brand-title">Product Processor</h1>
              <p className="brand-sub">Bulk import products from Excel</p>
            </div>
          </div>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <header className="hero">
          <h1>
            Turn a spreadsheet into <span className="accent">live products</span>.
          </h1>
          <p>
            Upload an Excel sheet and the event-driven pipeline validates every row,
            creates the valid products, and emails you the results.
          </p>
        </header>

        <nav className="segmented" role="tablist" aria-label="Sections">
          <button
            role="tab"
            aria-selected={tab === 'upload'}
            className={tab === 'upload' ? 'active' : ''}
            onClick={() => setTab('upload')}
          >
            <UploadIcon /> Upload
          </button>
          <button
            role="tab"
            aria-selected={tab === 'products'}
            className={tab === 'products' ? 'active' : ''}
            onClick={() => setTab('products')}
          >
            <BoxIcon /> Products
          </button>
        </nav>

        {tab === 'upload' ? <UploadPanel /> : <ProductsPanel />}

        <p className="foot">Built with NestJS · S3 · RabbitMQ · BullMQ · PostgreSQL</p>
      </div>
    </div>
  );
}

/* ---- inline icons (keep bundle lean, theme via currentColor) ---- */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
    </svg>
  );
}
