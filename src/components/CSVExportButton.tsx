'use client';
import { Download, Loader2 } from 'lucide-react';
import { useCSVExport } from '@/hooks/useCSVExport';
import type { CSVOptions } from '@/lib/csv';

interface CSVExportButtonProps {
  type: 'data' | 'table' | 'summary';
  filename?: string;
  className?: string;
  children?: React.ReactNode;

  // For data export
  data?: any[];
  columns?: string[];

  // For table export
  tableSelector?: string;

  // For summary export
  title?: string;
  summary?: Record<string, string | number>;

  // CSV options
  options?: CSVOptions;
}

export default function CSVExportButton({
  type,
  filename = 'export.csv',
  className = '',
  children,
  data = [],
  columns,
  tableSelector,
  title = 'Report',
  summary = {},
  options = {},
}: CSVExportButtonProps) {
  const {
    isExporting,
    error,
    exportData,
    exportTable,
    exportSummary,
    clearError,
  } = useCSVExport();

  const handleExport = () => {
    clearError();

    const csvOptions = { filename, ...options };

    try {
      switch (type) {
        case 'data':
          if (data.length > 0) {
            exportData(data, columns, csvOptions);
          } else {
            throw new Error('No data to export');
          }
          break;

        case 'table':
          if (tableSelector) {
            const table = document.querySelector(
              tableSelector
            ) as HTMLTableElement;
            if (table) {
              exportTable(table, csvOptions);
            } else {
              throw new Error(
                `Table with selector "${tableSelector}" not found`
              );
            }
          } else {
            throw new Error('Table selector is required for table export');
          }
          break;

        case 'summary':
          exportSummary(title, summary, data, csvOptions);
          break;

        default:
          throw new Error('Invalid export type');
      }
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const defaultContent = (
    <>
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </>
  );

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`${className} ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {children || defaultContent}
      </button>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
}
