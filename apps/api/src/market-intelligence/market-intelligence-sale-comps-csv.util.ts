import { BadRequestException } from '@nestjs/common';

export type ParsedSaleCompRow = {
  suburb: string;
  city?: string;
  sale_price: number;
  transfer_date: string;
  property_type?: string;
  bedrooms?: number;
  price_per_sqm?: number;
  source_type?: string;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: string[], names: string[]): number {
  for (const name of names) {
    const idx = headers.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseSaleCompsCsv(csvText: string, maxRows = 500): ParsedSaleCompRow[] {
  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) throw new BadRequestException('CSV is empty');

  const firstCells = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstCells.includes('suburb') || firstCells.includes('sale_price');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader ? firstCells : ['suburb', 'sale_price', 'transfer_date', 'city', 'source_type'];

  const suburbIdx = headerIndex(headers, ['suburb', 'address_suburb']);
  const priceIdx = headerIndex(headers, ['sale_price', 'price', 'sale price']);
  const dateIdx = headerIndex(headers, ['transfer_date', 'date', 'transfer date']);
  const cityIdx = headerIndex(headers, ['city', 'address_city']);
  const typeIdx = headerIndex(headers, ['property_type', 'type']);
  const bedIdx = headerIndex(headers, ['bedrooms', 'beds']);
  const sqmIdx = headerIndex(headers, ['price_per_sqm', 'price_per_sq_m']);
  const sourceIdx = headerIndex(headers, ['source_type', 'source']);

  if (suburbIdx < 0 || priceIdx < 0 || dateIdx < 0) {
    throw new BadRequestException('CSV must include suburb, sale_price, and transfer_date columns');
  }

  const rows: ParsedSaleCompRow[] = [];
  for (const line of dataLines) {
    if (rows.length >= maxRows) break;
    const cells = splitCsvLine(line);
    const suburb = cells[suburbIdx]?.trim();
    const salePrice = Number(String(cells[priceIdx] ?? '').replace(/[^\d.-]/g, ''));
    const transferDate = cells[dateIdx]?.trim();
    if (!suburb || !transferDate || !Number.isFinite(salePrice) || salePrice <= 0) continue;
    rows.push({
      suburb,
      city: cityIdx >= 0 ? cells[cityIdx]?.trim() || 'Windhoek' : 'Windhoek',
      sale_price: salePrice,
      transfer_date: transferDate,
      property_type: typeIdx >= 0 ? cells[typeIdx]?.trim() : undefined,
      bedrooms: bedIdx >= 0 && cells[bedIdx] ? Number(cells[bedIdx]) : undefined,
      price_per_sqm: sqmIdx >= 0 && cells[sqmIdx] ? Number(cells[sqmIdx]) : undefined,
      source_type: sourceIdx >= 0 ? cells[sourceIdx]?.trim() : 'deeds',
    });
  }

  if (!rows.length) {
    throw new BadRequestException('No valid rows found in CSV');
  }
  return rows;
}
