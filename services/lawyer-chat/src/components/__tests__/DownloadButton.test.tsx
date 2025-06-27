import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DownloadButton from '../DownloadButton';
import { useSidebarStore } from '@/store/sidebar';

// Mock the store
jest.mock('@/store/sidebar');

describe('DownloadButton', () => {
  const mockOnDownloadPDF = jest.fn();
  const mockOnDownloadText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSidebarStore as jest.Mock).mockReturnValue({
      isDarkMode: false,
    });
  });

  describe('Standard mode', () => {
    it('renders with default label', () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
          label="Export Report"
        />
      );

      expect(screen.getByText('Export Report')).toBeInTheDocument();
    });

    it('shows dropdown menu when clicked', () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Download as PDF')).toBeInTheDocument();
      expect(screen.getByText('Download as Text')).toBeInTheDocument();
    });

    it('calls onDownloadPDF when PDF option is clicked', async () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Download as PDF'));

      await waitFor(() => {
        expect(mockOnDownloadPDF).toHaveBeenCalledTimes(1);
        expect(mockOnDownloadText).not.toHaveBeenCalled();
      });
    });

    it('calls onDownloadText when Text option is clicked', async () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Download as Text'));

      await waitFor(() => {
        expect(mockOnDownloadText).toHaveBeenCalledTimes(1);
        expect(mockOnDownloadPDF).not.toHaveBeenCalled();
      });
    });

    it('shows loading state during download', async () => {
      mockOnDownloadPDF.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Download as PDF'));

      expect(screen.getByText('Downloading...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Download')).toBeInTheDocument();
      });
    });
  });

  describe('Compact mode', () => {
    it('renders icon button in compact mode', () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
          compact={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Download');
      expect(screen.queryByText('Download')).not.toBeInTheDocument();
    });

    it('shows dropdown menu when clicked in compact mode', () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
          compact={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('applies custom title in compact mode', () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
          compact={true}
          label="Export Data"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Export Data');
    });
  });

  describe('Dropdown behavior', () => {
    it('closes dropdown when clicking outside', () => {
      render(
        <div>
          <div data-testid="outside">Outside area</div>
          <DownloadButton
            onDownloadPDF={mockOnDownloadPDF}
            onDownloadText={mockOnDownloadText}
          />
        </div>
      );

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Download as PDF')).toBeInTheDocument();

      // Click outside
      fireEvent.click(screen.getByTestId('outside'));
      expect(screen.queryByText('Download as PDF')).not.toBeInTheDocument();
    });

    it('closes dropdown after successful download', async () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Download as PDF'));

      await waitFor(() => {
        expect(screen.queryByText('Download as PDF')).not.toBeInTheDocument();
      });
    });

    it('handles download errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockOnDownloadPDF.mockRejectedValue(new Error('Download failed'));

      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Download as PDF'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Download failed:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Dark mode styling', () => {
    it('applies dark mode styles', () => {
      (useSidebarStore as jest.Mock).mockReturnValue({
        isDarkMode: true,
      });

      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-700');
    });

    it('applies light mode styles', () => {
      (useSidebarStore as jest.Mock).mockReturnValue({
        isDarkMode: false,
      });

      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200');
    });
  });

  describe('Disabled state', () => {
    it('disables button during download', async () => {
      mockOnDownloadPDF.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Download as PDF'));

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(
        <DownloadButton
          onDownloadPDF={mockOnDownloadPDF}
          onDownloadText={mockOnDownloadText}
          className="custom-class"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });
});