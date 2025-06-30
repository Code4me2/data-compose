import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SafeMarkdown from '../SafeMarkdown';
import { useSidebarStore } from '@/store/sidebar';

// Mock the store
jest.mock('@/store/sidebar');

// Mock ReactMarkdown to control its behavior
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children, components }: { children: React.ReactNode; components?: Record<string, React.ComponentType> }) {
    // For testing error scenarios
    if (children === 'THROW_ERROR') {
      throw new Error('Markdown render error');
    }
    
    // For testing different markdown elements
    if (children.includes('# Heading')) {
      return <h1>Heading</h1>;
    }
    if (children.includes('**bold**')) {
      return <p><strong>bold</strong></p>;
    }
    if (children.includes('[link]')) {
      const Link = components?.a || 'a';
      return <p><Link href="https://example.com">link</Link></p>;
    }
    if (children.includes('```javascript')) {
      const Code = components?.code || 'code';
      return <Code className="language-javascript" inline={false}>console.log('test');</Code>;
    }
    if (children.includes('`inline`')) {
      const Code = components?.code || 'code';
      return <p><Code inline={true}>inline</Code></p>;
    }
    if (children.includes('![image]')) {
      const Img = components?.img || 'img';
      return <Img src="test.jpg" alt="image" />;
    }
    if (children.includes('| Header |')) {
      const Table = components?.table || 'table';
      const Th = components?.th || 'th';
      const Td = components?.td || 'td';
      return (
        <Table>
          <thead>
            <tr>
              <Th>Header</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Cell</Td>
            </tr>
          </tbody>
        </Table>
      );
    }
    
    // Default case
    return <div>{children}</div>;
  };
});

describe('SafeMarkdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSidebarStore as jest.Mock).mockReturnValue({
      isDarkMode: false,
    });
  });

  it('renders simple markdown content', () => {
    render(<SafeMarkdown content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders headings', () => {
    render(<SafeMarkdown content="# Heading" />);
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    render(<SafeMarkdown content="**bold**" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });

  it('renders links with security attributes', () => {
    render(<SafeMarkdown content="[link](https://example.com)" />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('text-blue-500');
  });

  it('renders code blocks with language label', () => {
    render(<SafeMarkdown content="```javascript\nconsole.log('test');\n```" />);
    
    expect(screen.getByText("console.log('test');")).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders inline code with styling', () => {
    render(<SafeMarkdown content="`inline`" />);
    
    const code = screen.getByText('inline');
    expect(code.tagName).toBe('CODE');
    expect(code).toHaveClass('bg-gray-100', 'text-pink-600');
  });

  it('renders images with error handling', () => {
    render(<SafeMarkdown content="![image](test.jpg)" />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'test.jpg');
    expect(img).toHaveAttribute('alt', 'image');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveClass('max-w-full', 'h-auto');
    
    // Test error handling
    fireEvent.error(img);
    expect(img).toHaveAttribute('alt', 'Image failed to load');
    expect(img).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
  });

  it('renders tables with responsive wrapper', () => {
    render(<SafeMarkdown content="| Header |\n|--------|\n| Cell |" />);
    
    const table = screen.getByRole('table');
    expect(table).toHaveClass('min-w-full', 'divide-y');
    
    const th = screen.getByText('Header');
    expect(th.tagName).toBe('TH');
    expect(th).toHaveClass('px-4', 'py-2');
    
    const td = screen.getByText('Cell');
    expect(td.tagName).toBe('TD');
    expect(td).toHaveClass('px-4', 'py-2');
  });

  it('applies custom className', () => {
    render(<SafeMarkdown content="Test" className="custom-class" />);
    
    const wrapper = screen.getByText('Test').parentElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('shows error fallback when markdown fails to render', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<SafeMarkdown content="THROW_ERROR" />);
    
    expect(screen.getByText('Unable to render message')).toBeInTheDocument();
    expect(screen.getByText('The message content could not be displayed properly. The raw content has been preserved.')).toBeInTheDocument();
    expect(screen.getByText('Show raw content')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('shows raw content when error details are expanded', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<SafeMarkdown content="THROW_ERROR" />);
    
    const detailsToggle = screen.getByText('Show raw content');
    fireEvent.click(detailsToggle);
    
    expect(screen.getByText('THROW_ERROR')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  describe('Dark mode styling', () => {
    beforeEach(() => {
      (useSidebarStore as jest.Mock).mockReturnValue({
        isDarkMode: true,
      });
    });

    it('applies dark mode styles to inline code', () => {
      render(<SafeMarkdown content="`inline`" />);
      
      const code = screen.getByText('inline');
      expect(code).toHaveClass('bg-gray-800', 'text-pink-400');
    });

    it('applies dark mode styles to code blocks', () => {
      render(<SafeMarkdown content="```javascript\ncode\n```" />);
      
      const langLabel = screen.getByText('javascript');
      expect(langLabel).toHaveClass('bg-gray-700', 'text-gray-300');
    });

    it('applies dark mode styles to tables', () => {
      render(<SafeMarkdown content="| Header |\n|--------|\n| Cell |" />);
      
      const th = screen.getByText('Header');
      expect(th).toHaveClass('text-gray-300', 'bg-gray-800');
      
      const td = screen.getByText('Cell');
      expect(td).toHaveClass('text-gray-300', 'border-gray-700');
    });

    it('applies dark mode styles to error fallback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<SafeMarkdown content="THROW_ERROR" />);
      
      const errorContainer = screen.getByText('Unable to render message').parentElement?.parentElement?.parentElement;
      expect(errorContainer).toHaveClass('bg-red-900/20', 'border-red-800');
      
      consoleSpy.mockRestore();
    });
  });

  it('resets when content changes after error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const { rerender } = render(<SafeMarkdown content="THROW_ERROR" />);
    
    expect(screen.getByText('Unable to render message')).toBeInTheDocument();
    
    // Change content to valid markdown
    rerender(<SafeMarkdown content="Valid content" />);
    
    expect(screen.queryByText('Unable to render message')).not.toBeInTheDocument();
    expect(screen.getByText('Valid content')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});