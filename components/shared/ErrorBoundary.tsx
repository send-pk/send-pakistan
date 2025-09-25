import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-content-primary flex flex-col items-center justify-center p-4 text-center" role="alert">
            <div className="max-w-md">
                <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-content-primary mb-2">Oops! Something went wrong.</h1>
                <p className="text-content-secondary mb-6">
                    We've encountered an unexpected error. Refreshing the page might fix it.
                </p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 text-base rounded-md font-semibold bg-primary text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface transition-all duration-200 focus:ring-primary"
                >
                    Refresh Page
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;