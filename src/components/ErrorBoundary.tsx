import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * 全局 React 错误边界（v6 新增）
 *
 * 修复 setup-wizard 窗口白屏问题：
 * 任何子组件抛错时显示 fallback UI（白底黑字错误信息 + 堆栈），
 * 而不是完全空白窗口。配合 main.rs 的 devtools + error capture，
 * 用户能立即看到 JS 错误根因。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <div
          style={{
            padding: '24px',
            background: '#fff5f5',
            color: '#1a1a1a',
            fontFamily: 'Consolas, "Courier New", monospace',
            minHeight: '100vh',
            overflow: 'auto',
          }}
        >
          <h1 style={{ color: '#c62828', margin: '0 0 16px 0' }}>
            ⚠️ ProClaw 渲染错误
          </h1>
          <p style={{ color: '#666', margin: '0 0 16px 0' }}>
            应用遇到了一个未处理的错误，请将以下信息反馈给开发团队。
          </p>
          <h2 style={{ color: '#c62828', fontSize: '14px', margin: '16px 0 8px 0' }}>
            错误信息
          </h2>
          <pre
            style={{
              background: '#fff',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {error?.message || 'Unknown error'}
          </pre>
          {error?.stack && (
            <>
              <h2 style={{ color: '#c62828', fontSize: '14px', margin: '16px 0 8px 0' }}>
                堆栈跟踪
              </h2>
              <pre
                style={{
                  background: '#fff',
                  border: '1px solid #ffcdd2',
                  borderRadius: '4px',
                  padding: '12px',
                  fontSize: '11px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '300px',
                  overflow: 'auto',
                  margin: 0,
                }}
              >
                {error.stack}
              </pre>
            </>
          )}
          {errorInfo?.componentStack && (
            <>
              <h2 style={{ color: '#c62828', fontSize: '14px', margin: '16px 0 8px 0' }}>
                组件堆栈
              </h2>
              <pre
                style={{
                  background: '#fff',
                  border: '1px solid #ffcdd2',
                  borderRadius: '4px',
                  padding: '12px',
                  fontSize: '11px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '300px',
                  overflow: 'auto',
                  margin: 0,
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
