import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Citation } from '@/types';

interface PDFOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
}

export class PDFGenerator {
  private pdf: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private margin: number;
  private currentY: number;
  private lineHeight: number;

  constructor() {
    this.pdf = new jsPDF();
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
  }

  // Generate PDF for chat messages
  generateChatPDF(messages: Array<{ role: string; content: string; timestamp?: Date }>, options?: PDFOptions): Blob {
    this.initializePDF(options);
    
    // Add title
    this.pdf.setFontSize(16);
    this.pdf.text(options?.title || 'Legal Research Chat History', this.margin, this.currentY);
    this.currentY += 15;

    // Add timestamp if requested
    if (options?.includeTimestamp) {
      this.pdf.setFontSize(10);
      this.pdf.text(`Generated on: ${new Date().toLocaleString()}`, this.margin, this.currentY);
      this.currentY += 10;
    }

    // Add separator
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;

    // Add messages
    messages.forEach((message, index) => {
      this.addMessage(message, index);
    });

    return this.pdf.output('blob');
  }

  // Generate PDF for citations
  generateCitationsPDF(citations: Citation[], options?: PDFOptions): Blob {
    this.initializePDF(options);
    
    // Add title
    this.pdf.setFontSize(16);
    this.pdf.text(options?.title || 'Legal Citations', this.margin, this.currentY);
    this.currentY += 15;

    // Add timestamp
    if (options?.includeTimestamp) {
      this.pdf.setFontSize(10);
      this.pdf.text(`Generated on: ${new Date().toLocaleString()}`, this.margin, this.currentY);
      this.currentY += 10;
    }

    // Add separator
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;

    // Add citations
    citations.forEach((citation, index) => {
      this.addCitation(citation, index + 1);
    });

    return this.pdf.output('blob');
  }

  // Generate PDF from HTML element (for analytics charts)
  async generateFromElement(element: HTMLElement, options?: PDFOptions): Promise<Blob> {
    this.initializePDF(options);
    
    // Add title
    this.pdf.setFontSize(16);
    this.pdf.text(options?.title || 'Legal Analytics Report', this.margin, this.currentY);
    this.currentY += 15;

    // Add timestamp
    if (options?.includeTimestamp) {
      this.pdf.setFontSize(10);
      this.pdf.text(`Generated on: ${new Date().toLocaleString()}`, this.margin, this.currentY);
      this.currentY += 10;
    }

    // Convert element to canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      logging: false
    });

    // Calculate dimensions to fit on PDF
    const imgWidth = this.pageWidth - (2 * this.margin);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Check if we need a new page
    if (this.currentY + imgHeight > this.pageHeight - this.margin) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    this.pdf.addImage(imgData, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);

    return this.pdf.output('blob');
  }

  private initializePDF(options?: PDFOptions) {
    if (options) {
      this.pdf.setProperties({
        title: options.title || 'Legal Document',
        author: options.author || 'Lawyer Chat AI Assistant',
        subject: options.subject || 'Legal Research',
        keywords: options.keywords?.join(', ') || 'legal,research,ai,citations',
        creator: 'Lawyer Chat - AI Legal Assistant'
      });
    }
  }

  private addMessage(message: { role: string; content: string; timestamp?: Date }, _index: number) {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 40) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }

    // Add message header
    this.pdf.setFontSize(12);
    this.pdf.setFont(undefined, 'bold');
    const role = message.role === 'user' ? 'You' : 'AI Assistant';
    this.pdf.text(`${role}:`, this.margin, this.currentY);
    
    if (message.timestamp) {
      this.pdf.setFontSize(10);
      this.pdf.setFont(undefined, 'normal');
      const timeStr = new Date(message.timestamp).toLocaleTimeString();
      this.pdf.text(timeStr, this.pageWidth - 50, this.currentY);
    }
    
    this.currentY += this.lineHeight;

    // Add message content
    this.pdf.setFontSize(11);
    this.pdf.setFont(undefined, 'normal');
    
    const lines = this.pdf.splitTextToSize(message.content, this.pageWidth - (2 * this.margin));
    lines.forEach((line: string) => {
      if (this.currentY > this.pageHeight - this.margin) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }
      this.pdf.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight;
    });

    this.currentY += 5; // Add space between messages
  }

  private addCitation(citation: Citation, number: number) {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 60) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }

    // Citation number and title
    this.pdf.setFontSize(12);
    this.pdf.setFont(undefined, 'bold');
    this.pdf.text(`${number}. ${citation.title}`, this.margin, this.currentY);
    this.currentY += this.lineHeight;

    // Citation details
    this.pdf.setFontSize(10);
    this.pdf.setFont(undefined, 'normal');
    
    // Court and date
    this.pdf.text(`Court: ${citation.court}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
    
    this.pdf.text(`Date: ${citation.date}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;

    // Case number if available
    if (citation.caseNumber) {
      this.pdf.text(`Case Number: ${citation.caseNumber}`, this.margin + 5, this.currentY);
      this.currentY += this.lineHeight;
    }

    // Source if available
    if (citation.source) {
      this.pdf.text(`Source: ${citation.source}`, this.margin + 5, this.currentY);
      this.currentY += this.lineHeight;
    }

    // Excerpt if available
    if (citation.excerpt) {
      this.pdf.text('Excerpt:', this.margin + 5, this.currentY);
      this.currentY += this.lineHeight;
      
      const excerptLines = this.pdf.splitTextToSize(citation.excerpt, this.pageWidth - (2 * this.margin) - 10);
      excerptLines.forEach((line: string) => {
        if (this.currentY > this.pageHeight - this.margin) {
          this.pdf.addPage();
          this.currentY = this.margin;
        }
        this.pdf.text(line, this.margin + 10, this.currentY);
        this.currentY += this.lineHeight;
      });
    }

    this.currentY += 10; // Add space between citations
  }
}

// Utility functions for text export
export function generateChatText(messages: Array<{ role: string; content: string; timestamp?: Date }>): string {
  let text = 'LEGAL RESEARCH CHAT HISTORY\n';
  text += `Generated on: ${new Date().toLocaleString()}\n`;
  text += '='.repeat(50) + '\n\n';

  messages.forEach((message) => {
    const role = message.role === 'user' ? 'YOU' : 'AI ASSISTANT';
    const timestamp = message.timestamp ? ` [${new Date(message.timestamp).toLocaleTimeString()}]` : '';
    text += `${role}${timestamp}:\n`;
    text += message.content + '\n';
    text += '-'.repeat(50) + '\n\n';
  });

  return text;
}

export function generateCitationsText(citations: Citation[]): string {
  let text = 'LEGAL CITATIONS\n';
  text += `Generated on: ${new Date().toLocaleString()}\n`;
  text += '='.repeat(50) + '\n\n';

  citations.forEach((citation, index) => {
    text += `${index + 1}. ${citation.title}\n`;
    if (citation.court) text += `   Court: ${citation.court}\n`;
    if (citation.date) text += `   Date: ${citation.date}\n`;
    if (citation.caseNumber) text += `   Case Number: ${citation.caseNumber}\n`;
    if (citation.source) text += `   Source: ${citation.source}\n`;
    if (citation.excerpt) {
      text += `   Excerpt: ${citation.excerpt}\n`;
    }
    text += '\n';
  });

  return text;
}

// Download utility functions
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}