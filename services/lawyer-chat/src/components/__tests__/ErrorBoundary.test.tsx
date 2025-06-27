import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';
import { errorMonitoring } from '@/lib/errorMonitoring';
import { createLogger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/lib/errorMonitoring');
jest.mock('@/utils/logger');

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws in useEffect
const ThrowErrorInEffect = () => {
  React.useEffect(() => {
    throw new Error('Effect error');
  }, []);
  return <div>Component</div>;
};

describe('ErrorBoundary', () => {
  const mockLogger = {
    error: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (createLogger as jest.Mock).mockReturnValue(mockLogger);
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches errors and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
    expect(screen.getByText(/This component encountered an error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('displays custom fallback when provided', () => {
    const CustomFallback = <div>Custom error UI</div>;
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('logs error with correct context', () => {
    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'React ErrorBoundary caught error at page level',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundaryLevel: 'page',
        errorCount: 1,
        url: expect.any(String),
        userAgent: expect.any(String),
        timestamp: expect.any(String)
      })
    );
  });

  it('sends error to monitoring service', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(errorMonitoring.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: 'ErrorBoundary',
        componentStack: expect.any(String),
        errorBoundaryLevel: 'component'
      }),
      'medium'
    );
  });

  it('resets error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Component Error/i)).toBeInTheDocument();

    // Click Try Again
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('shows isolated error UI when isolate prop is true', () => {
    render(
      <ErrorBoundary isolate={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong in this component/i)).toBeInTheDocument();
  });

  it('resets on resetKeys change when resetOnKeysChange is true', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['key1']} resetOnKeysChange={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Component Error/i)).toBeInTheDocument();

    // Change reset key
    rerender(
      <ErrorBoundary resetKeys={['key2']} resetOnKeysChange={true}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('displays network error message for fetch errors', () => {
    const NetworkError = () => {
      throw new Error('Failed to fetch data');
    };

    render(
      <ErrorBoundary>
        <NetworkError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Unable to connect to the server/i)).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('provides Go Home button for page-level errors', () => {
    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(
      <ErrorBoundary level="page">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const goHomeButton = screen.getByRole('button', { name: /Go Home/i });
    expect(goHomeButton).toBeInTheDocument();

    fireEvent.click(goHomeButton);
    expect(window.location.href).toBe('/');
  });
});

describe('withErrorBoundary HOC', () => {
  const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;

  it('wraps component with ErrorBoundary', () => {
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    render(<WrappedComponent text="Hello" />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('passes error boundary props correctly', () => {
    const onError = jest.fn();
    const WrappedComponent = withErrorBoundary(TestComponent, {
      onError,
      level: 'page'
    });

    const ThrowingComponent = withErrorBoundary(() => {
      throw new Error('HOC error');
    }, { onError, level: 'page' });

    render(<ThrowingComponent />);

    expect(onError).toHaveBeenCalled();
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
  });
});