import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import proClawTheme from './config/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // 审计修复 SEC-P2-06: 使用 textContent 代替 innerHTML，防止 XSS
  const root = document.getElementById('root');
  if (root && !root.innerHTML) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'color:red;padding:20px;font-family:monospace;';
    const h2 = document.createElement('h2');
    h2.textContent = 'Application Error';
    const pre1 = document.createElement('pre');
    pre1.textContent = String(event.error?.message || event.error || 'Unknown error');
    const pre2 = document.createElement('pre');
    pre2.textContent = event.error?.stack || '';
    errorDiv.append(h2, pre1, pre2);
    root?.appendChild(errorDiv);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

console.log('Application starting...');
console.log('Environment:', import.meta.env.MODE);

try {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ThemeProvider theme={proClawTheme}>
        <CssBaseline />
        {/* v6：全局 ErrorBoundary 捕获 React 渲染错误，显示 fallback UI 而不是白屏 */}
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>,
  );
} catch (err) {
  console.error('Failed to render App:', err);
  // 审计修复 SEC-P2-06: 使用 textContent 代替 innerHTML
  const root = document.getElementById('root');
  if (root) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'color:red;padding:20px;';
    const h2 = document.createElement('h2');
    h2.textContent = 'Render Error';
    const pre1 = document.createElement('pre');
    pre1.textContent = (err as Error)?.message || '';
    const pre2 = document.createElement('pre');
    pre2.textContent = (err as Error)?.stack || '';
    errorDiv.append(h2, pre1, pre2);
    root.innerHTML = '';
    root.appendChild(errorDiv);
  }
}
