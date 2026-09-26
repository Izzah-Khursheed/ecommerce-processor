import { useRef, useState, DragEvent } from 'react';
import { api } from '../api';
import type { UploadBatch } from '../types';

export function UploadPanel() {
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [batch, setBatch] = useState<UploadBatch | null>(null);
  const [error, setError] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please choose an .xlsx Excel file.');
      return;
    }
    setError('');
    setFile(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function pollUntilDone(id: string) {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const b = await api.getBatch(id);
      setStatus(b.status);
      if (b.status === 'COMPLETED' || b.status === 'FAILED') {
        setBatch(b);
        return;
      }
    }
  }

  async function onSubmit() {
    setError('');
    setBatch(null);
    if (!file) return setError('Please choose a .xlsx file.');
    if (!email.trim()) return setError('Please enter an email.');

    setBusy(true);
    setStatus('PENDING');
    try {
      const res = await api.upload(file, email.trim());
      const id = (res.batchId ?? res.id)!;
      await pollUntilDone(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <h2>Upload an Excel file</h2>

        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="dropzone-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
            </svg>
          </div>
          <p className="dropzone-title">Drag &amp; drop your .xlsx here</p>
          <p className="dropzone-sub">or click to browse</p>
          {file && (
            <div className="filename">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              {file.name}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <label className="field-label" htmlFor="email">Result email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter Your Gmail Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={onSubmit} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" /> Processing…
            </>
          ) : (
            'Upload & Process'
          )}
        </button>

        {error && <p className="error-text">{error}</p>}
      </div>

      {busy && !batch && (
        <div className="card">
          <div className="status-row">
            <span className={`pill ${status}`}><span className="dot" /> {status}</span>
            <span className="muted">Working through the pipeline…</span>
          </div>
        </div>
      )}

      {batch && (
        <div className="card">
          <div className="panel-head">
            <h2>Result</h2>
            <span className={`pill ${batch.status}`}><span className="dot" /> {batch.status}</span>
          </div>

          <div className="stats stats-4">
            <div className="stat total">
              <div className="num">{batch.totalRows}</div>
              <div className="lbl">Total rows</div>
            </div>
            <div className="stat success">
              <div className="num">{batch.successCount}</div>
              <div className="lbl">Successful</div>
            </div>
            <div className="stat danger">
              <div className="num">{batch.failedCount}</div>
              <div className="lbl">Unsuccessful</div>
            </div>
            <div className="stat warn">
              <div className="num">{batch.duplicateCount}</div>
              <div className="lbl">Duplicates</div>
            </div>
          </div>

          {(batch.failedCount > 0 || batch.duplicateCount > 0) && batch.errorFileKey && (
            <a className="download-btn" href={api.errorFileUrl(batch.id)} target="_blank" rel="noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              </svg>
              Download error sheet
            </a>
          )}
          {batch.failedCount === 0 && batch.duplicateCount === 0 && (
            <p className="notice ok">Every row was valid and imported.</p>
          )}
          {batch.duplicateCount > 0 && (
            <p className="notice">
              <span>
                {batch.duplicateCount} row(s) were skipped as duplicates (the SKU already
                exists or repeats in the file), they're not counted as successful.
              </span>
            </p>
          )}

          <p className="notice">
            <span>
              Get Result on Gmail · check your inbox and spam for the summary and error sheet.
              See created products in the <strong>Products</strong> tab.
            </span>
          </p>
        </div>
      )}
    </>
  );
}
