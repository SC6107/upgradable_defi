import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Catches React render errors and shows a fallback instead of blank screen.
 * Prevents "flash then blank" when something throws in the tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom, #0f172a, #020617)',
            color: '#e2e8f0',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f87171' }}>
              页面加载出错
            </h1>
            <p style={{ marginBottom: '0.5rem' }}>{this.state.error.message}</p>
            {this.state.errorInfo?.componentStack && (
              <pre
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#1e293b',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              请打开浏览器开发者工具 (F12) 查看 Console 中的完整错误。
              若从其他设备访问，请确保后端 API 地址正确（如设置 VITE_API_URL 为实际后端地址）。
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
