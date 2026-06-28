/**
 * ErrorBoundary - 全局错误边界
 * 防止单个组件的运行时错误导致整个 App 闪退
 * 捕获错误后展示错误堆栈，方便诊断
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 将错误详情写入控制台（生产环境可对接 Sentry/Crashlytics）
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error:', error);
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo: errorInfo.componentStack || null });
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>⚠️ 应用遇到错误</Text>
            <Text style={styles.subtitle}>{error?.name ?? 'Error'}</Text>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.label}>错误消息</Text>
            <Text style={styles.message}>{error?.message ?? '未知错误'}</Text>
            {error?.stack ? (
              <>
                <Text style={styles.label}>调用栈</Text>
                <Text style={styles.stack} selectable>
                  {error.stack}
                </Text>
              </>
            ) : null}
            {errorInfo ? (
              <>
                <Text style={styles.label}>组件栈</Text>
                <Text style={styles.stack} selectable>
                  {errorInfo}
                </Text>
              </>
            ) : null}
            <Text style={styles.meta}>
              平台: {Platform.OS} {Platform.Version} | 时间: {new Date().toISOString()}
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.button} onPress={this.handleReload}>
            <Text style={styles.buttonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff5f5',
  },
  header: {
    backgroundColor: '#dc2626',
    padding: 20,
    paddingTop: 56,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fecaca',
    marginTop: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  stack: {
    fontSize: 11,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
  },
  meta: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    margin: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
