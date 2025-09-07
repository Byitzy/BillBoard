"use client";
import { useRef, useState, useCallback } from 'react';
import { exportElementToPDF, exportDataToPDF, generateReportPDF, PDFOptions } from '@/lib/pdf';

export interface UsePDFExportReturn {
  elementRef: React.RefObject<HTMLElement>;
  isExporting: boolean;
  error: string | null;
  exportElement: (options?: PDFOptions) => Promise<void>;
  exportData: (data: any[], columns: string[], title: string, options?: PDFOptions) => Promise<void>;
  exportReport: (title: string, summary: Record<string, string | number>, data: any[], options?: PDFOptions) => Promise<void>;
  clearError: () => void;
}

export function usePDFExport(): UsePDFExportReturn {
  const elementRef = useRef<HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const exportElement = useCallback(async (options: PDFOptions = {}) => {
    if (!elementRef.current) {
      setError('No element to export');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      await exportElementToPDF(elementRef.current, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportData = useCallback(async (
    data: any[],
    columns: string[],
    title: string,
    options: PDFOptions = {}
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      await exportDataToPDF(data, columns, title, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportReport = useCallback(async (
    title: string,
    summary: Record<string, string | number>,
    data: any[],
    options: PDFOptions = {}
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      await generateReportPDF(title, summary, data, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    elementRef,
    isExporting,
    error,
    exportElement,
    exportData,
    exportReport,
    clearError
  };
}