import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DarkModeToggle from '../DarkModeToggle';
import { useSidebarStore } from '@/store/sidebar';

// Mock the store
jest.mock('@/store/sidebar');

describe('DarkModeToggle', () => {
  const mockToggleDarkMode = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in light mode', () => {
    (useSidebarStore as jest.Mock).mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);
    
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Light mode')).toBeInTheDocument();
  });

  it('renders in dark mode', () => {
    (useSidebarStore as jest.Mock).mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);
    
    const button = screen.getByRole('button', { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('toggles dark mode when clicked', () => {
    (useSidebarStore as jest.Mock).mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockToggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it('has correct toggle position in light mode', () => {
    (useSidebarStore as jest.Mock).mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    const { container } = render(<DarkModeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    
    // Check for Sun icon in light mode
    const sunIcon = container.querySelector('.lucide-sun');
    expect(sunIcon).toBeInTheDocument();
  });

  it('has correct toggle position in dark mode', () => {
    (useSidebarStore as jest.Mock).mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });

    const { container } = render(<DarkModeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    
    // Check for Moon icon in dark mode
    const moonIcon = container.querySelector('.lucide-moon');
    expect(moonIcon).toBeInTheDocument();
  });
});