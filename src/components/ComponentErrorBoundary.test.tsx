import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ComponentErrorBoundary from './ComponentErrorBoundary';

// Mock error reporter
vi.mock('../utils/errorReporting', () => ({
  errorReporter: {
    captureReactError: vi.fn(),
  },
}));

// Suppress console.error in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ComponentErrorBoundary', () => {
  const ThrowError = ({ error = 'Test error' }: { error?: string }) => {
    throw new Error(error);
  };

  const SafeComponent = () => <div>Safe content</div>;

  it('renders children when no error occurs', () => {
    render(
      <ComponentErrorBoundary componentName="Test">
        <SafeComponent />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches errors and displays default error UI', () => {
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <ThrowError error="Something went wrong" />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
    // Use getByRole to find the specific paragraph, not the stack trace
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'P' && content.includes('Something went wrong');
    })).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    const customFallback = (error: Error) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ComponentErrorBoundary componentName="Test" fallback={customFallback}>
        <ThrowError error="Custom error message" />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Custom error: Custom error message')).toBeInTheDocument();
  });

  it('silently fails when silentFail is true', () => {
    const { container } = render(
      <ComponentErrorBoundary componentName="Test" silentFail>
        <ThrowError />
      </ComponentErrorBoundary>
    );

    // Should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ComponentErrorBoundary componentName="Test" onError={onError}>
        <ThrowError error="Test error" />
      </ComponentErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test error',
    }));
  });

  it('displays component name in error message', () => {
    render(
      <ComponentErrorBoundary componentName="MySpecialComponent">
        <ThrowError />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('MySpecialComponent Error')).toBeInTheDocument();
  });
});
