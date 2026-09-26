import { Controller, Get, Header } from '@nestjs/common';

/**
 * Serves a small browser "test console" at GET / so the whole pipeline can be
 * exercised from a browser (upload a file, watch status, download error sheet).
 * This is a developer convenience UI, not part of the core API.
 */
@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html')
  home(): string {
    return TEST_CONSOLE_HTML;
  }
}

const TEST_CONSOLE_HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Processor Test Console</title>
<style>
  :root { --accent:#2b6cb0; --ink:#1a2233; --muted:#5b6577; --line:#dfe3ea; --ok:#1a7f37; --bad:#b42318; --bg:#f4f6fb; }
  * { box-sizing:border-box; }
  body { font-family:"Segoe UI",Arial,sans-serif; color:var(--ink); background:var(--bg); margin:0; padding:24px; }
  .wrap { max-width:860px; margin:0 auto; }
  h1 { color:var(--accent); margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:12px; padding:20px 22px; margin-bottom:18px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
  label { display:block; font-weight:600; margin:12px 0 6px; }
  input[type=email], input[type=file] { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px; font-size:14px; }
  button { background:var(--accent); color:#fff; border:0; padding:11px 20px; border-radius:8px; font-size:15px; cursor:pointer; margin-top:16px; }
  button:disabled { opacity:.5; cursor:not-allowed; }
  .row { display:flex; gap:10px; flex-wrap:wrap; }
  .links a { display:inline-block; margin:6px 10px 6px 0; color:var(--accent); text-decoration:none; border:1px solid var(--line); padding:8px 12px; border-radius:8px; background:#fff; }
  .links a:hover { background:#eef4fb; }
  #result { margin-top:16px; }
  table { border-collapse:collapse; width:100%; margin-top:10px; }
  th,td { border:1px solid var(--line); padding:8px 12px; text-align:left; }
  th { background:#f7f9fc; }
  .ok { color:var(--ok); font-weight:700; }
  .bad { color:var(--bad); font-weight:700; }
  .pill { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:700; }
  .pill.PENDING,.pill.PROCESSING { background:#fff3cd; color:#8a6d00; }
  .pill.COMPLETED { background:#d7f5df; color:var(--ok); }
  .pill.FAILED { background:#fde2e0; color:var(--bad); }
  code { background:#f6f8fa; padding:1px 6px; border-radius:5px; }
  .muted { color:var(--muted); font-size:13px; }
  .dl { display:inline-block; margin-top:12px; background:var(--bad); color:#fff; padding:9px 16px; border-radius:8px; text-decoration:none; }
</style>
</head>
<body>
<div class="wrap">
  <h1>🛒 Processor Test Console</h1>
  <p class="sub">Upload a product Excel sheet and watch the event-driven pipeline process it live.</p>

  <div class="card">
    <h3 style="margin-top:0">1) Upload an Excel file</h3>
    <label for="email">Result email</label>
    <input id="email" type="email" value="you@example.com" />
    <label for="file">Excel file (.xlsx)</label>
    <input id="file" type="file" accept=".xlsx" />
    <p class="muted">Tip: use the generated <code>samples/mixed.xlsx</code> (2 valid + 5 invalid rows) to see the error sheet.</p>
    <button id="uploadBtn">Upload &amp; Process</button>
    <div id="result"></div>
  </div>

  <div class="card links">
    <h3 style="margin-top:0">2) Open these in your browser</h3>
    <a href="/products" target="_blank">📦 Products (JSON)</a>
    <a href="/health" target="_blank">❤️ Health</a>
    <a href="http://localhost:15672" target="_blank">🐇 RabbitMQ UI (guest/guest)</a>
    <a href="http://localhost:9001" target="_blank">🗄️ MinIO console (minioadmin/minioadmin)</a>
    <p class="muted">The result email opens as an Ethereal preview link printed in the app's terminal logs.</p>
  </div>
</div>

<script>
const $ = (id) => document.getElementById(id);
const resultEl = $('result');

$('uploadBtn').addEventListener('click', async () => {
  const fileInput = $('file');
  const email = $('email').value.trim();
  if (!fileInput.files.length) { resultEl.innerHTML = '<p class="bad">Please choose a .xlsx file first.</p>'; return; }
  if (!email) { resultEl.innerHTML = '<p class="bad">Please enter an email.</p>'; return; }

  const btn = $('uploadBtn');
  btn.disabled = true;
  resultEl.innerHTML = '<p>Uploading…</p>';

  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  fd.append('email', email);

  try {
    const res = await fetch('/uploads', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { resultEl.innerHTML = '<p class="bad">Error: ' + (data.message || res.status) + '</p>'; btn.disabled = false; return; }
    resultEl.innerHTML = '<p>✅ Accepted. Batch <code>' + data.batchId + '</code> — processing…</p>';
    pollStatus(data.batchId, btn);
  } catch (e) {
    resultEl.innerHTML = '<p class="bad">Request failed: ' + e.message + '</p>';
    btn.disabled = false;
  }
});

async function pollStatus(batchId, btn) {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const res = await fetch('/uploads/' + batchId);
    const b = await res.json();
    if (b.status === 'COMPLETED' || b.status === 'FAILED') {
      renderBatch(b);
      btn.disabled = false;
      return;
    }
    resultEl.innerHTML = '<p>Status: <span class="pill ' + b.status + '">' + b.status + '</span> …</p>';
  }
  btn.disabled = false;
}

function renderBatch(b) {
  let html = '<table>';
  html += '<tr><th>Status</th><td><span class="pill ' + b.status + '">' + b.status + '</span></td></tr>';
  html += '<tr><th>Total rows</th><td>' + b.totalRows + '</td></tr>';
  html += '<tr><th>✅ Successful</th><td class="ok">' + b.successCount + '</td></tr>';
  html += '<tr><th>❌ Unsuccessful</th><td class="bad">' + b.failedCount + '</td></tr>';
  html += '</table>';
  if (b.failedCount > 0 && b.errorFileKey) {
    html += '<a class="dl" href="/uploads/' + b.id + '/errors" target="_blank">⬇ Download error sheet (unsuccessful rows)</a>';
  }
  html += '<p class="muted">📧 A result email was sent — check the app terminal for the Ethereal preview link. View created products at <a href="/products" target="_blank">/products</a>.</p>';
  resultEl.innerHTML = html;
}
</script>
</body>
</html>`;
