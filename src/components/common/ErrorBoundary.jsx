/**
 * Error Boundary Component (Roadmap Phase 4.4)
 *
 * Catches render errors in child component tree and shows a fallback UI
 * instead of crashing the whole application.
 *
 * Production integration points:
 * - Sentry / Datadog error reporting
 * - OTEL span error recording
 */

import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Production: send to error reporting service
    // e.g. Sentry.captureException(error, { extra: errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback from props
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.handleReset,
        });
      }

      const isDark = this.props.theme !== 'light';

      return (
        <div
          className={`flex flex-col items-center justify-center p-8 rounded-xl m-4 ${
            isDark
              ? 'bg-red-950/30 border border-red-800/50'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="text-4xl mb-4">💥</div>
          <h2
            className={`text-lg font-semibold mb-2 ${
              isDark ? 'text-red-400' : 'text-red-700'
            }`}
          >
            Something went wrong
          </h2>
          <p
            className={`text-sm mb-4 max-w-md text-center ${
              isDark ? 'text-red-300/70' : 'text-red-600'
            }`}
          >
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>

          {this.state.errorInfo && (
            <details
              className={`mb-4 text-xs max-w-lg w-full ${
                isDark ? 'text-slate-400' : 'text-gray-500'
              }`}
            >
              <summary className="cursor-pointer hover:underline">
                Stack trace
              </summary>
              <pre
                className={`mt-2 p-3 rounded-lg overflow-auto max-h-40 text-xs ${
                  isDark ? 'bg-slate-900' : 'bg-gray-100'
                }`}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper HOC for functional components
 */
export function withErrorBoundary(WrappedComponent, fallback) {
  return function ErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary theme={props.theme} fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
