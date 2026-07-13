import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ComponentErrorBoundary from './ComponentErrorBoundary';

// Mock error reporter
vi.mock('../../../shared/errorReporting/errorReporter', () => ({
  errorReporter: {
    captureReactError: vi.fn(),
  },
  sanitizeContext: (context: Record<string, unknown> | undefined) => context,
  sanitizeTextForStorage: (value: string) =>
    value
      .replace(/\btoken=[^\s]+/gi, '[TOKEN]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/\bresume=[^\s]+/gi, 'resume=[REDACTED]'),
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

    expect(screen.getByText('This section needs attention')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'P' && content.includes('This section could not load');
    })).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('does not expose private details in default error UI', () => {
    vi.stubEnv('DEV', false);

    render(
      <ComponentErrorBoundary componentName="PrivateComponent">
        <ThrowError error="token=raw-secret private@example.test resume=private-file" />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('This section needs attention')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.tagName === 'P' && content.includes('safe support report');
    })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('raw-secret');
    expect(document.body.textContent).not.toContain('private@example.test');
    expect(document.body.textContent).not.toContain('resume=private-file');
    expect(document.body.textContent).not.toContain('[TOKEN]');

    vi.unstubAllEnvs();
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

  it('does not expose component names in the visible error message', () => {
    render(
      <ComponentErrorBoundary componentName="MySpecialComponent">
        <ThrowError />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('This section needs attention')).toBeInTheDocument();
    expect(screen.queryByText('MySpecialComponent Error')).not.toBeInTheDocument();
  });
});
