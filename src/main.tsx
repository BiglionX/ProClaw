import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import proClawTheme from './config/theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getDefaultHermesBundle, setHermesApi, HermesApi } from './lib/hermes';
import { isTauri } from './lib/tauri';
import { loadBuiltinPluginFrontends } from './lib/pluginFrontend';
import './styles.css';

/**
 * Hermes Skills 后端初始化
 *
 * - Tauri 桌面生产:走 Rust 侧 hermes_db_* 命令(TauriRpcExecutor),
 *   Skill 表与业务表共享主库的加密/事务/备份策略(见 hermes_commands.rs)。
 * - 开发 / Storybook / Playwright E2E(vite dev,非 Tauri):内存版默认值,
 *   让 HermesSkillsPage 等页面在没有真实数据库时也能正常渲染。
 */
async function initHermesApi(): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const { makeTauriRpcExecutor, createHermesBundle } = await import('./lib/hermes');
      // 确保 Hermes 表已建(Rust 启动时通常已建,这里幂等确认)
      await invoke('hermes_bootstrap');
      const bundle = createHermesBundle(
        makeTauriRpcExecutor(invoke),
        { skipSchemaInit: true },
      );
      await bundle.seedPresets();
      setHermesApi(new HermesApi(bundle));
      return;
    } catch (e) {
      console.warn('[Hermes] Tauri bundle 初始化失败,回退内存库:', e);
    }
  }
  setHermesApi(new HermesApi(getDefaultHermesBundle()));
}

void initHermesApi();

/**
 * 加载内置插件的 frontend 脚本（src/plugins/*\/frontend/index.js）
 * 由 Vite 在 build 时通过 import.meta.glob 打包到主 bundle，运行时无网络请求。
 *
 * 必须先于 React 应用挂载（或同时异步等待），否则插件的 ProClawPlugin.registerRoute
 * 调用会在 App 的 setRouteRegistry 之前发生，导致路由注册失败。
 */
void loadBuiltinPluginFrontends()
  .then(({ loaded, skipped }) => {
    console.log(`[PluginFrontend] 加载完成: ${loaded.length} 个, 跳过 ${skipped.length} 个`, {
      loaded,
      skipped,
    });
  })
  .catch((err) => {
    console.error('[PluginFrontend] 加载失败:', err);
  });

/**
 * Sprint 2.15: App 启动时后台多设备同步
 *
 * 触发条件：
 *   1. Tauri 环境（生产构建）
 *   2. 用户已配置 NvWaX API Key
 *   3. render 完成后 5 秒开始（避开启动热点）
 *
 * 行为：拉取最近 30 个 NvWaX 会话 + 本地 SQLite 快照，做 last-write-wins 合并。
 * 不弹任何 toast（避免打扰）；仅在云端有新增时通过
 * 'virtual-company:sync-cloud-only' 事件通知 UI 层。
 */
void (async () => {
  if (!isTauri()) return;
  // 等待 5 秒让主流程稳定
  await new Promise((r) => setTimeout(r, 5000));
  try {
    // 检查 NvWaX API Key 是否配置（避免无意义的同步尝试）
    const { invoke } = await import('@tauri-apps/api/core');
    const apiKey = await invoke<string | null>('get_nvwax_api_key');
    if (!apiKey) return;
    // 动态导入避免循环依赖
    const { startBackgroundSync } = await import('./lib/virtualCompanySync');
    await startBackgroundSync();
  } catch (e) {
    console.debug('[virtualCompanySync] 后台同步跳过：', e);
  }
})();

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 大列表未引入 react-window。拉长缓存，避免聚焦窗口或重连时整表重拉。
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
console.log('Environment:', import.meta.env.MODE);

try {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={proClawTheme}>
        <CssBaseline />
        {/* v6：全局 ErrorBoundary 捕获 React 渲染错误，显示 fallback UI 而不是白屏 */}
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
      </QueryClientProvider>
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
