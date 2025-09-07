export interface CSVOptions {
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'local' | 'us';
}

const DEFAULT_OPTIONS: Required<CSVOptions> = {
  filename: 'export.csv',
  delimiter: ',',
  includeHeaders: true,
  dateFormat: 'local',
};

function formatValue(value: any, dateFormat: CSVOptions['dateFormat']): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle dates
  if (value instanceof Date) {
    switch (dateFormat) {
      case 'iso':
        return value.toISOString();
      case 'us':
        return value.toLocaleDateString('en-US');
      case 'local':
      default:
        return value.toLocaleDateString();
    }
  }

  // Handle strings that might contain the delimiter
  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function arrayToCSV(
  data: any[],
  columns?: string[],
  options: CSVOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!data.length) {
    return '';
  }

  // Use provided columns or infer from first object
  const headers = columns || Object.keys(data[0]);
  const rows: string[] = [];

  // Add headers if requested
  if (opts.includeHeaders) {
    rows.push(
      headers
        .map((header) => formatValue(header, opts.dateFormat))
        .join(opts.delimiter)
    );
  }

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) =>
      formatValue(row[header], opts.dateFormat)
    );
    rows.push(values.join(opts.delimiter));
  });

  return rows.join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers
    const url = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    window.open(url, '_blank');
  }
}

export function exportDataToCSV(
  data: any[],
  columns?: string[],
  options: CSVOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const csvContent = arrayToCSV(data, columns, opts);
  downloadCSV(csvContent, opts.filename);
}

export function exportTableToCSV(
  tableElement: HTMLTableElement,
  options: CSVOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rows: string[][] = [];

  // Extract headers if requested
  if (opts.includeHeaders) {
    const headerRow = tableElement.querySelector('thead tr');
    if (headerRow) {
      const headers: string[] = [];
      headerRow.querySelectorAll('th, td').forEach((cell) => {
        headers.push((cell.textContent || '').trim());
      });
      if (headers.length > 0) {
        rows.push(headers);
      }
    }
  }

  // Extract data rows
  const bodyRows = tableElement.querySelectorAll('tbody tr');
  bodyRows.forEach((row) => {
    const cells: string[] = [];
    row.querySelectorAll('td, th').forEach((cell) => {
      cells.push((cell.textContent || '').trim());
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  // Convert to CSV format
  const csvContent = rows
    .map((row) =>
      row.map((cell) => formatValue(cell, opts.dateFormat)).join(opts.delimiter)
    )
    .join('\n');

  downloadCSV(csvContent, opts.filename);
}

// Utility function to create a summary report CSV
export function exportSummaryToCSV(
  title: string,
  summary: Record<string, string | number>,
  data: any[] = [],
  options: CSVOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rows: string[] = [];

  // Add title
  rows.push(`"${title}"`);
  rows.push(`"Generated on: ${new Date().toLocaleDateString()}"`);
  rows.push(''); // Empty line

  // Add summary section
  rows.push('"SUMMARY"');
  Object.entries(summary).forEach(([key, value]) => {
    rows.push(`"${key}","${value}"`);
  });

  // Add data section if provided
  if (data.length > 0) {
    rows.push(''); // Empty line
    rows.push('"DETAILS"');

    // Add data as CSV
    const dataCSV = arrayToCSV(data, undefined, {
      ...opts,
      includeHeaders: true,
    });
    rows.push(dataCSV);
  }

  const csvContent = rows.join('\n');
  downloadCSV(csvContent, opts.filename);
}
