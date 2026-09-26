/**
 * Generates sample Excel files for testing:
 *   samples/valid.xlsx  — all rows valid
 *   samples/mixed.xlsx  — mix of valid + invalid rows (to see the error sheet)
 *
 * Run:  npm run seed:sample
 */
import * as ExcelJS from 'exceljs';
import { mkdirSync } from 'fs';
import { join } from 'path';

const HEADERS = ['sku', 'name', 'description', 'price', 'category', 'color', 'stock'];

async function write(fileName: string, rows: any[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Products');
  ws.addRow(HEADERS);
  rows.forEach((r) => ws.addRow(r));
  const dir = join(process.cwd(), 'samples');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileName);
  await wb.xlsx.writeFile(path);
  console.log('Wrote', path);
}

async function main() {
  // All valid.
  await write('valid.xlsx', [
    ['SKU-1001', 'Blue Ceramic Mug', '350ml glazed mug', 12.99, 'Mugs', 'Blue', 120],
    ['SKU-1002', 'Red Vase', 'Hand-painted vase', 24.5, 'Decor', 'Red', 40],
    ['SKU-1003', 'Green Notebook', 'A5 dotted notebook', 6.75, 'Stationery', 'Green', 300],
  ]);

  // Mixed: rows 3,5,6 are invalid.
  await write('mixed.xlsx', [
    ['SKU-2001', 'Wooden Spoon', 'Beech wood spoon', 3.2, 'Kitchen', 'Brown', 500], // valid
    ['SKU-2002', 'Steel Bottle', '1L insulated bottle', 15.0, 'Kitchen', 'Silver', 80], // valid
    ['', 'Missing SKU Item', 'No sku here', 9.99, 'Misc', 'Black', 10], // invalid: sku
    ['SKU-2004', 'Negative Price', 'Bad price', -5, 'Misc', 'White', 10], // invalid: price
    ['SKU-2005', 'Bad Stock', 'Stock not a number', 8.0, 'Misc', 'Blue', 'lots'], // invalid: stock
    ['SKU-2006', '', 'Missing name', 4.0, 'Misc', 'Red', 5], // invalid: name
    ['SKU-2001', 'Duplicate SKU', 'Same sku as row 1', 3.2, 'Kitchen', 'Brown', 500], // invalid: dup in file
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
