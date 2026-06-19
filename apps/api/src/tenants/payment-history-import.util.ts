export type PaymentHistoryImportRow = {
  row_number: number;
  period_month: string;
  amount: number;
  bank_reference?: string;
  on_time: boolean;
};

export type ParsedPaymentHistoryImport = {
  rows: PaymentHistoryImportRow[];
  errors: string[];
};

const MONTH_YEAR_RE = /^(\d{4})-(\d{1,2})$/;

function parseOnTime(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const normalized = value.trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'on_time', 'on-time'].includes(normalized)) return true;
  if (['no', 'n', 'false', '0', 'late'].includes(normalized)) return false;
  return true;
}

function periodMonthFromParts(year: number, month: number): string | null {
  if (month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function parsePaymentHistoryCsv(csvText: string, maxRows = 36): ParsedPaymentHistoryImport {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: PaymentHistoryImportRow[] = [];
  const errors: string[] = [];

  if (!lines.length) {
    return { rows, errors: ['CSV is empty.'] };
  }

  const startIndex = lines[0].toLowerCase().includes('month') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    if (rows.length >= maxRows) {
      errors.push(`Maximum ${maxRows} rows per import.`);
      break;
    }

    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length < 2) {
      errors.push(`Row ${i + 1}: expected month_year,amount[,reference][,on_time].`);
      continue;
    }

    const monthMatch = MONTH_YEAR_RE.exec(parts[0]);
    if (!monthMatch) {
      errors.push(`Row ${i + 1}: month_year must be YYYY-MM.`);
      continue;
    }

    const period = periodMonthFromParts(Number(monthMatch[1]), Number(monthMatch[2]));
    if (!period) {
      errors.push(`Row ${i + 1}: invalid month.`);
      continue;
    }

    const amount = Number(parts[1].replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Row ${i + 1}: amount must be a positive number.`);
      continue;
    }

    rows.push({
      row_number: i + 1,
      period_month: period,
      amount,
      bank_reference: parts[2] || undefined,
      on_time: parseOnTime(parts[3]),
    });
  }

  return { rows, errors };
}
