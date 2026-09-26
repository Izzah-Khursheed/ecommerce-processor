import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { REQUIRED_COLUMNS } from '../../common/constants';

export interface ParsedRow {
  rowNumber: number; // 1-based row number in the sheet (for error reporting)
  raw: Record<string, unknown>; // keyed by canonical column name
}

export interface FailedRow extends ParsedRow {
  errors: string[];
}

// Friendly header aliases -> canonical field name.
const HEADER_ALIASES: Record<string, string> = {
  sku: 'sku',
  'unique number': 'sku',
  'unique no': 'sku',
  'product id': 'sku',
  id: 'sku',
  name: 'name',
  'product name': 'name',
  title: 'name',
  description: 'description',
  desc: 'description',
  price: 'price',
  cost: 'price',
  category: 'category',
  color: 'color',
  colour: 'color',
  stock: 'stock',
  quantity: 'stock',
  qty: 'stock',
  inventory: 'stock',
  'inventory stock': 'stock',
};

const normalizeHeader = (h: string): string =>
  h.toString().trim().toLowerCase().replace(/[_\s]+/g, ' ');

@Injectable()
export class ExcelService {
  /**
   * Read the first worksheet into canonical row objects.
   * Uses the header row to map columns (aliases supported).
   */
  async readRows(buffer: Buffer): Promise<ParsedRow[]> {
    const wb = new ExcelJS.Workbook();
    // Cast avoids a @types/node Buffer<ArrayBufferLike> vs ExcelJS Buffer mismatch.
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];

    // Build columnIndex -> canonical field name from the header (row 1).
    const headerRow = ws.getRow(1);
    const colToField: Record<number, string> = {};
    headerRow.eachCell((cell, colNumber) => {
      const key = normalizeHeader(String(cell.value ?? ''));
      const field = HEADER_ALIASES[key];
      if (field) colToField[colNumber] = field;
    });

    const rows: ParsedRow[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      // Skip completely empty rows.
      const hasAnyValue = row.values && (row.values as unknown[]).some((v) => v !== null && v !== undefined && v !== '');
      if (!hasAnyValue) continue;

      const raw: Record<string, unknown> = {};
      for (const [colNumberStr, field] of Object.entries(colToField)) {
        const cell = row.getCell(Number(colNumberStr));
        raw[field] = this.cellValue(cell);
      }
      rows.push({ rowNumber: r, raw });
    }
    return rows;
  }

  /** Extract a primitive value from an ExcelJS cell (handles formulas/rich text). */
  private cellValue(cell: ExcelJS.Cell): unknown {
    const v = cell.value as unknown;
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      if ('result' in obj) return obj.result; // formula
      if ('text' in obj) return obj.text; // rich text / hyperlink
    }
    return v;
  }

  /**
   * Build a new .xlsx containing only the failed rows plus an "errors" column
   * explaining exactly what was wrong. Returns a Buffer ready to upload/attach.
   */
  async buildErrorWorkbook(failedRows: FailedRow[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ecommerce-processor';
    const ws = wb.addWorksheet('Unsuccessful Rows');

    const columns = [
      { header: 'Row #', key: 'rowNumber', width: 8 },
      ...REQUIRED_COLUMNS.map((c) => ({ header: c, key: c, width: 20 })),
      { header: 'errors', key: 'errors', width: 50 },
    ];
    ws.columns = columns;

    // Style the header row.
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2B6CB0' },
    };

    for (const fr of failedRows) {
      ws.addRow({
        rowNumber: fr.rowNumber,
        sku: fr.raw.sku ?? '',
        name: fr.raw.name ?? '',
        description: fr.raw.description ?? '',
        price: fr.raw.price ?? '',
        category: fr.raw.category ?? '',
        color: fr.raw.color ?? '',
        stock: fr.raw.stock ?? '',
        errors: fr.errors.join('; '),
      });
    }

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
