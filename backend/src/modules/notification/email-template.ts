import { FileProcessedEvent } from '../../common/events/product-events';

/** The required-format table shown in the email so users can fix & re-upload. */
const REQUIRED_FORMAT_ROWS: Array<[string, string]> = [
  ['sku', 'Required, unique. The product’s unique number.'],
  ['name', 'Required. Product name.'],
  ['description', 'Required. Product description.'],
  ['price', 'Required. A number greater than 0.'],
  ['category', 'Required. Product category.'],
  ['color', 'Required. Product color.'],
  ['stock', 'Required. A whole number ≥ 0 (inventory).'],
];

export function buildResultEmail(data: FileProcessedEvent): string {
  const { fileName, totalRows, successCount, failedCount, duplicateCount } = data;
  const notImported = failedCount + duplicateCount;

  const formatRows = REQUIRED_FORMAT_ROWS.map(
    ([col, rule]) =>
      `<tr><td style="padding:6px 10px;border:1px solid #dfe3ea;"><code>${col}</code></td>
           <td style="padding:6px 10px;border:1px solid #dfe3ea;">${rule}</td></tr>`,
  ).join('');

  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;color:#1a2233;max-width:640px;margin:auto;">
    <h2 style="color:#2b6cb0;">Your product upload has been processed</h2>
    <p>File: <strong>${escapeHtml(fileName)}</strong></p>

    <table style="border-collapse:collapse;margin:16px 0;">
      <tr>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;background:#f7f9fc;">Total rows read</td>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;"><strong>${totalRows}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;background:#f7f9fc;">✅ Successful</td>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;color:#1a7f37;"><strong>${successCount}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;background:#f7f9fc;">❌ Unsuccessful (invalid data)</td>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;color:#b42318;"><strong>${failedCount}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;background:#f7f9fc;">♻️ Duplicates (SKU already exists)</td>
        <td style="padding:8px 14px;border:1px solid #dfe3ea;color:#9a6b00;"><strong>${duplicateCount}</strong></td>
      </tr>
    </table>

    ${
      notImported > 0
        ? `<p>We’ve attached an Excel file (<strong>unsuccessful-rows.xlsx</strong>) containing every row
             that was <strong>not imported</strong> (invalid data and duplicates), each with an
             <code>errors</code> column explaining why.</p>`
        : `<p style="color:#1a7f37;">🎉 Every row was valid and imported successfully. Nothing to fix!</p>`
    }

    <h3 style="color:#2b6cb0;margin-top:24px;">Required Excel format</h3>
    <p>Each row = one product. Include a header row with these columns:</p>
    <table style="border-collapse:collapse;width:100%;">
      <tr>
        <th style="padding:6px 10px;border:1px solid #2b6cb0;background:#2b6cb0;color:#fff;text-align:left;">Column</th>
        <th style="padding:6px 10px;border:1px solid #2b6cb0;background:#2b6cb0;color:#fff;text-align:left;">Rule</th>
      </tr>
      ${formatRows}
    </table>

    <p style="color:#5b6577;font-size:13px;margin-top:24px;">
      Fix the highlighted rows and re-upload the corrected sheet. This is an automated message.
    </p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}
