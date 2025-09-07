"use client";
import { Download, Loader2 } from 'lucide-react';
import { usePDFExport } from '@/hooks/usePDFExport';
import { PDFOptions } from '@/lib/pdf';

interface PDFExportButtonProps {
  type: 'element' | 'data' | 'report';
  filename?: string;
  className?: string;
  children?: React.ReactNode;
  
  // For element export
  elementSelector?: string;
  
  // For data export
  data?: any[];
  columns?: string[];
  title?: string;
  
  // For report export
  summary?: Record<string, string | number>;
  
  // PDF options
  options?: PDFOptions;
}

export default function PDFExportButton({
  type,
  filename = 'export.pdf',
  className = '',
  children,
  elementSelector,
  data = [],
  columns = [],
  title = 'Report',
  summary = {},
  options = {}
}: PDFExportButtonProps) {
  const { isExporting, error, exportElement, exportData, exportReport, clearError } = usePDFExport();

  const handleExport = async () => {
    clearError();
    
    const pdfOptions = { filename, ...options };

    try {
      switch (type) {
        case 'element':
          if (elementSelector) {
            const element = document.querySelector(elementSelector) as HTMLElement;
            if (element) {
              const { exportElementToPDF } = await import('@/lib/pdf');
              await exportElementToPDF(element, pdfOptions);
            } else {
              throw new Error(`Element with selector "${elementSelector}" not found`);
            }
          }
          break;
          
        case 'data':
          if (data.length > 0 && columns.length > 0) {
            await exportData(data, columns, title, pdfOptions);
          } else {
            throw new Error('Data and columns are required for data export');
          }
          break;
          
        case 'report':
          await exportReport(title, summary, data, pdfOptions);
          break;
          
        default:
          throw new Error('Invalid export type');
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const defaultContent = (
    <>
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Exporting...' : 'Export PDF'}
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
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}