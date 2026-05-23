import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

console.log('Application starting...');
console.log('Environment:', import.meta.env.MODE);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
