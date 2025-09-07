import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFOptions {
  filename?: string;
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  scale?: number;
}

const DEFAULT_OPTIONS: Required<PDFOptions> = {
  filename: 'export.pdf',
  format: 'a4',
  orientation: 'portrait',
  margin: 20,
  scale: 2
};

export async function exportElementToPDF(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const canvas = await html2canvas(element, {
      scale: opts.scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      removeContainer: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = opts.margin;

    const availableWidth = pdfWidth - (margin * 2);
    const availableHeight = pdfHeight - (margin * 2);

    const ratio = Math.min(
      availableWidth / (imgWidth * 0.264583), // Convert px to mm
      availableHeight / (imgHeight * 0.264583)
    );

    const scaledWidth = (imgWidth * 0.264583) * ratio;
    const scaledHeight = (imgHeight * 0.264583) * ratio;

    const x = margin + (availableWidth - scaledWidth) / 2;
    const y = margin + (availableHeight - scaledHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
    pdf.save(opts.filename);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('Failed to generate PDF export');
  }
}

export async function exportDataToPDF(
  data: any[],
  columns: string[],
  title: string,
  options: PDFOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    const margin = opts.margin;
    let yPos = margin;

    // Add title
    pdf.setFontSize(18);
    pdf.text(title, margin, yPos);
    yPos += 10;

    // Add date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Calculate column widths
    const availableWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
    const colWidth = availableWidth / columns.length;

    // Add headers
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    columns.forEach((col, index) => {
      pdf.text(col, margin + (index * colWidth), yPos);
    });
    yPos += 8;

    // Add line under headers
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pdf.internal.pageSize.getWidth() - margin, yPos);
    yPos += 5;

    // Add data rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    data.forEach((row) => {
      if (yPos > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPos = margin;
      }

      columns.forEach((col, index) => {
        const value = row[col] || '';
        const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const truncated = text.length > 30 ? text.substring(0, 27) + '...' : text;
        pdf.text(truncated, margin + (index * colWidth), yPos);
      });
      yPos += 6;
    });

    pdf.save(opts.filename);
  } catch (error) {
    console.error('Failed to generate data PDF:', error);
    throw new Error('Failed to generate PDF export');
  }
}

export function generateReportPDF(
  title: string,
  summary: Record<string, string | number>,
  data: any[],
  options: PDFOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    const margin = opts.margin;
    let yPos = margin;

    // Add title
    pdf.setFontSize(20);
    pdf.text(title, margin, yPos);
    yPos += 15;

    // Add summary section
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPos);
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    Object.entries(summary).forEach(([key, value]) => {
      pdf.text(`${key}: ${value}`, margin, yPos);
      yPos += 5;
    });
    
    yPos += 10;

    // Add data section if provided
    if (data.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Details', margin, yPos);
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      data.forEach((item, index) => {
        if (yPos > pdf.internal.pageSize.getHeight() - margin - 20) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.text(`${index + 1}. ${JSON.stringify(item)}`, margin, yPos);
        yPos += 5;
      });
    }

    // Add footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `Page ${i} of ${pageCount} - Generated on ${new Date().toLocaleDateString()}`,
        margin,
        pdf.internal.pageSize.getHeight() - 10
      );
    }

    pdf.save(opts.filename);
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to generate report PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}