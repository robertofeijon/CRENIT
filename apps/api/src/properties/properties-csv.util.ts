import { BadRequestException } from '@nestjs/common';

export type ParsedPropertyUnitRow = {
  property_name: string;
  address_street: string;
  address_suburb: string;
  address_city: string;
  address_postcode?: string;
  property_type: string;
  unit_identifier: string;
  bedrooms?: number;
  bathrooms?: number;
  monthly_rent: number;
};

const REQUIRED_HEADERS = [
  'property_name',
  'address_street',
  'address_suburb',
  'address_city',
  'property_type',
  'unit_identifier',
  'monthly_rent',
] as const;

const PROPERTY_TYPES = new Set(['APARTMENT', 'HOUSE', 'FLAT', 'TOWNHOUSE', 'ROOM', 'COMMERCIAL']);

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '_');
}

export function parsePropertiesCsv(csvText: string, maxRows = 100): ParsedPropertyUnitRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) throw new BadRequestException('CSV is empty');

  const headerCells = splitCsvLine(lines[0]).map(normalizeHeader);
  const headerIndex = new Map(headerCells.map((h, i) => [h, i]));

  for (const required of REQUIRED_HEADERS) {
    if (!headerIndex.has(required)) {
      throw new BadRequestException(`CSV must include column: ${required}`);
    }
  }

  const rows: ParsedPropertyUnitRow[] = [];
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx += 1) {
    if (rows.length >= maxRows) break;
    const cells = splitCsvLine(lines[lineIdx]);
    const pick = (key: string) => cells[headerIndex.get(key)!] ?? '';

    const propertyName = pick('property_name');
    const unitId = pick('unit_identifier');
    const monthlyRent = Number(pick('monthly_rent'));
    const propertyType = pick('property_type').toUpperCase();

    if (!propertyName || !unitId || !Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      throw new BadRequestException(`Row ${lineIdx + 1}: property_name, unit_identifier, and monthly_rent are required`);
    }
    if (!PROPERTY_TYPES.has(propertyType)) {
      throw new BadRequestException(
        `Row ${lineIdx + 1}: property_type must be one of ${[...PROPERTY_TYPES].join(', ')}`,
      );
    }

    const bedroomsRaw = pick('bedrooms');
    const bathroomsRaw = pick('bathrooms');

    rows.push({
      property_name: propertyName,
      address_street: pick('address_street'),
      address_suburb: pick('address_suburb'),
      address_city: pick('address_city'),
      address_postcode: pick('address_postcode') || undefined,
      property_type: propertyType,
      unit_identifier: unitId,
      bedrooms: bedroomsRaw ? Number(bedroomsRaw) : undefined,
      bathrooms: bathroomsRaw ? Number(bathroomsRaw) : undefined,
      monthly_rent: monthlyRent,
    });
  }

  if (!rows.length) throw new BadRequestException('No valid rows found in CSV');
  return rows;
}

export const PROPERTIES_CSV_TEMPLATE = `property_name,address_street,address_suburb,address_city,property_type,unit_identifier,bedrooms,bathrooms,monthly_rent
Sunset Flats,12 Independence Ave,Kleine Kuppe,Windhoek,APARTMENT,Unit A,2,1,8500
Sunset Flats,12 Independence Ave,Kleine Kuppe,Windhoek,APARTMENT,Unit B,1,1,7200`;
