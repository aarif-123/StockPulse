/**
 * Utility to generate and trigger client-side CSV downloads.
 * Converts structured records to RFC 4180 compliant CSV format.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[]
): void {
  if (rows.length === 0) return;

  const columnKeys = headers ? headers.map((h) => h.key) : (Object.keys(rows[0]!) as (keyof T)[]);
  const columnLabels = headers ? headers.map((h) => h.label) : (columnKeys as string[]);

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows: string[] = [];
  csvRows.push(columnLabels.map(escapeCell).join(','));

  for (const row of rows) {
    const rowValues = columnKeys.map((key) => escapeCell(row[key]));
    csvRows.push(rowValues.join(','));
  }

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
