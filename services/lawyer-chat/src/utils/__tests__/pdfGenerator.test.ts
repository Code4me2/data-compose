import { PDFGenerator, generateChatText, generateCitationsText } from '../pdfGenerator';
import { Citation } from '@/types';

// Mock jsPDF
jest.mock('jspdf', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      internal: {
        pageSize: {
          height: 297,
          width: 210,
        },
      },
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      text: jest.fn(),
      line: jest.fn(),
      addPage: jest.fn(),
      output: jest.fn(() => new Blob(['mock-pdf'], { type: 'application/pdf' })),
      setProperties: jest.fn(),
      splitTextToSize: jest.fn((text: string) => [text]),
      addImage: jest.fn(),
    })),
  };
});

// Mock html2canvas
jest.mock('html2canvas', () => ({
  default: jest.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mockimage',
    width: 800,
    height: 600,
  }),
}));

describe('PDFGenerator', () => {
  let pdfGenerator: PDFGenerator;

  beforeEach(() => {
    pdfGenerator = new PDFGenerator();
  });

  describe('generateChatPDF', () => {
    it('should generate PDF with chat messages', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: new Date('2024-01-01') },
        { role: 'assistant', content: 'Hi there!', timestamp: new Date('2024-01-01') },
      ];

      const blob = pdfGenerator.generateChatPDF(messages, {
        title: 'Test Chat',
        includeTimestamp: true,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should handle messages without timestamps', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const blob = pdfGenerator.generateChatPDF(messages);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('generateCitationsPDF', () => {
    it('should generate PDF with citations', () => {
      const citations: Citation[] = [
        {
          id: '1',
          title: 'Smith v. Jones',
          court: 'Supreme Court',
          date: '2024-01-01',
          caseNumber: '123-456',
          excerpt: 'Legal precedent established...',
        },
      ];

      const blob = pdfGenerator.generateCitationsPDF(citations, {
        title: 'Legal Citations',
        includeTimestamp: true,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should handle citations with missing fields', () => {
      const citations: Citation[] = [
        {
          id: '1',
          title: 'Case Title Only',
        },
      ];

      const blob = pdfGenerator.generateCitationsPDF(citations);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('generateFromElement', () => {
    it('should generate PDF from HTML element', async () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = '<p>Test content</p>';

      const blob = await pdfGenerator.generateFromElement(mockElement, {
        title: 'Analytics Report',
        includeTimestamp: true,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });
  });
});

describe('Text generation functions', () => {
  describe('generateChatText', () => {
    it('should generate formatted text from messages', () => {
      const messages = [
        { role: 'user', content: 'Question?', timestamp: new Date('2024-01-01T10:00:00') },
        { role: 'assistant', content: 'Answer.', timestamp: new Date('2024-01-01T10:01:00') },
      ];

      const text = generateChatText(messages);

      expect(text).toContain('LEGAL RESEARCH CHAT HISTORY');
      expect(text).toContain('YOU [10:00:00 AM]:');
      expect(text).toContain('Question?');
      expect(text).toContain('AI ASSISTANT [10:01:00 AM]:');
      expect(text).toContain('Answer.');
    });

    it('should handle messages without timestamps', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
      ];

      const text = generateChatText(messages);
      
      expect(text).toContain('YOU:');
      expect(text).not.toContain('[');
    });
  });

  describe('generateCitationsText', () => {
    it('should generate formatted text from citations', () => {
      const citations: Citation[] = [
        {
          id: '1',
          title: 'Smith v. Jones',
          court: 'Supreme Court',
          date: '2024-01-01',
          caseNumber: '123-456',
          source: 'Legal Database',
          excerpt: 'Important ruling...',
        },
      ];

      const text = generateCitationsText(citations);

      expect(text).toContain('LEGAL CITATIONS');
      expect(text).toContain('1. Smith v. Jones');
      expect(text).toContain('Court: Supreme Court');
      expect(text).toContain('Date: 2024-01-01');
      expect(text).toContain('Case Number: 123-456');
      expect(text).toContain('Source: Legal Database');
      expect(text).toContain('Excerpt: Important ruling...');
    });

    it('should handle citations with missing fields', () => {
      const citations: Citation[] = [
        {
          id: '1',
          title: 'Minimal Citation',
        },
      ];

      const text = generateCitationsText(citations);
      
      expect(text).toContain('1. Minimal Citation');
      expect(text).not.toContain('Court:');
      expect(text).not.toContain('Date:');
    });
  });
});