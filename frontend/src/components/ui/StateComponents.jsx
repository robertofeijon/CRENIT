import React from "react";

/**
 * ErrorBoundary - Catches and displays React component errors
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const isDevelopment = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred. Please try refreshing the page.</p>
            {isDevelopment && this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
            <button onClick={this.resetError} className="btn btn--primary">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * LoadingSpinner - Reusable loading indicator
 */
export function LoadingSpinner({ size = "medium", centered = true }) {
  return (
    <div className={`spinner spinner--${size} ${centered ? "spinner--centered" : ""}`}>
      <div className="spinner-ring"></div>
      <span className="spinner-text">Loading...</span>
    </div>
  );
}

/**
 * Loading Skeleton - Placeholder while loading
 */
export function SkeletonLoader({ width = "100%", height = "20px", count = 1 }) {
  return (
    <div className="skeleton-loader">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-item" style={{ width, height }} />
      ))}
    </div>
  );
}

/**
 * EmptyState - Display when no data is available
 */
export function EmptyState({ title, description, icon, action }) {
  return (
    <div className="empty-state branded-empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

/**
 * Toast/Alert - Notification component
 */
export function Toast({ type = "info", message, onClose, autoClose = true }) {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoClose, onClose]);

  return (
    <div className={`toast toast--${type}`}>
      <span>{message}</span>
      <button onClick={onClose} className="toast-close" aria-label="Close">
        ✕
      </button>
    </div>
  );
}

/**
 * Modal - Simple modal dialog
 */
export function Modal({ title, isOpen, onClose, children, actions }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="modal-close" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-content">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </>
  );
}
