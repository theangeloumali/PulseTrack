/**
 * Generic, typed CSV export helpers.
 *
 * `toCsv` serializes an array of rows into an RFC-4180 compliant CSV string
 * (quote/comma/newline escaping, CRLF line endings) that imports cleanly into
 * Google Sheets and Excel. `downloadCsv` triggers a client-side download via a
 * Blob + temporary anchor. A UTF-8 BOM is prepended so Excel renders accented
 * characters correctly; Google Sheets ignores it.
 */

/** A single CSV cell value before stringification. */
export type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  /** Stable column id — also the value accessor when `map` is omitted. */
  key: string;
  /** Header label written to the first CSV row. */
  header: string;
  /** Optional value transform; receives the whole row. Falls back to `row[key]`. */
  map?: (row: T) => CsvCell;
}

/** RFC-4180: wrap in double quotes and double-up inner quotes when needed. */
function escapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** Serialize `rows` into an RFC-4180 CSV string using the given `columns`. */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeField(column.header)).join(',');

  const body = rows.map((row) =>
    columns
      .map((column) => {
        const value = column.map ? column.map(row) : (row as Record<string, unknown>)[column.key];
        return escapeField(toCell(value));
      })
      .join(','),
  );

  return [header, ...body].join('\r\n');
}

/** Download `csv` as a file named `filename` (client-side only). */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === 'undefined') return;

  const utf8Bom = '\uFEFF';
  const blob = new Blob([utf8Bom, csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
