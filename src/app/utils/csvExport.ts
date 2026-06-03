/**
 * Build a CSV string from column definitions and row records.
 * Prepends UTF-8 BOM so Excel opens Arabic text correctly on Windows.
 */
export function rowsToCsv(
  columns: { key: string; header: string }[],
  rows: Record<string, unknown>[]
): string {
  const esc = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headerLine = columns.map((c) => esc(c.header)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => esc(row[c.key])).join(',')
  );
  return [headerLine, ...body].join('\r\n');
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(
  filenameBase: string,
  columns: { key: string; header: string }[],
  rows: Record<string, unknown>[]
): void {
  const safe = filenameBase.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`${safe}_${stamp}.csv`, rowsToCsv(columns, rows));
}
