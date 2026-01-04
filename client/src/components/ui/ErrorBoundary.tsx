import { Component, ErrorInfo, ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches JavaScript errors in child components.
 * Displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback" style={{
          padding: "20px",
          textAlign: "center",
          color: "#ff6b6b",
          fontFamily: "'Press Start 2P', cursive",
          fontSize: "12px",
        }}>
          <p>Something went wrong.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="nes-btn is-warning"
            style={{ marginTop: "10px", fontFamily: "'Press Start 2P', cursive" }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface QueryErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
}

/**
 * Simple error display component for query errors.
 */
export function QueryErrorFallback({ error, onRetry }: QueryErrorFallbackProps) {
  return (
    <div className="query-error-fallback" style={{
      padding: "20px",
      textAlign: "center",
      color: "#ff6b6b",
      fontFamily: "'Press Start 2P', cursive",
      fontSize: "10px",
    }}>
      <p>Failed to load data</p>
      {error && (
        <p style={{ fontSize: "8px", opacity: 0.7, marginTop: "8px" }}>
          {error.message}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="nes-btn is-warning"
          style={{ marginTop: "10px", fontFamily: "'Press Start 2P', cursive", fontSize: "8px" }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
