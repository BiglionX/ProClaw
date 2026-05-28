import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // 将错误显示在页面上用于调试
  const root = document.getElementById('root');
  if (root && !root.innerHTML) {
    root.innerHTML = `<div style="color:red;padding:20px;font-family:monospace;">
      <h2>Application Error</h2>
      <pre>${String(event.error?.message || event.error || 'Unknown error')}</pre>
      <pre>${event.error?.stack || ''}</pre>
    </div>`;
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
      <App />
    </React.StrictMode>,
  );
} catch (err) {
  console.error('Failed to render App:', err);
  document.getElementById('root')!.innerHTML = `<div style="color:red;padding:20px;">
    <h2>Render Error</h2>
    <pre>${(err as Error)?.message}</pre>
    <pre>${(err as Error)?.stack}</pre>
  </div>`;
}
