"use client";
import { useState, useCallback } from 'react';
import { exportDataToCSV, exportTableToCSV, exportSummaryToCSV, CSVOptions } from '@/lib/csv';

export interface UseCSVExportReturn {
  isExporting: boolean;
  error: string | null;
  exportData: (data: any[], columns?: string[], options?: CSVOptions) => void;
  exportTable: (tableElement: HTMLTableElement, options?: CSVOptions) => void;
  exportSummary: (title: string, summary: Record<string, string | number>, data?: any[], options?: CSVOptions) => void;
  clearError: () => void;
}

export function useCSVExport(): UseCSVExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const exportData = useCallback((
    data: any[],
    columns?: string[],
    options: CSVOptions = {}
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      exportDataToCSV(data, columns, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV');
    } finally {
      // Use a small delay to show the exporting state
      setTimeout(() => setIsExporting(false), 300);
    }
  }, []);

  const exportTable = useCallback((
    tableElement: HTMLTableElement,
    options: CSVOptions = {}
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      exportTableToCSV(tableElement, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV');
    } finally {
      setTimeout(() => setIsExporting(false), 300);
    }
  }, []);

  const exportSummary = useCallback((
    title: string,
    summary: Record<string, string | number>,
    data: any[] = [],
    options: CSVOptions = {}
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      exportSummaryToCSV(title, summary, data, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV');
    } finally {
      setTimeout(() => setIsExporting(false), 300);
    }
  }, []);

  return {
    isExporting,
    error,
    exportData,
    exportTable,
    exportSummary,
    clearError
  };
}