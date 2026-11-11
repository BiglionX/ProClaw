import { Suspense, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { HashRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import IncomingCallDialog from './components/Call/IncomingCallDialog';
import { renderAppRoutes } from './config/routes';
import { initPluginAPI } from './lib/pluginApi';
import {
  EVT_OPEN_VIRTUAL_COMPANY_WIZARD,
  EVT_OPEN_VIRTUAL_COMPANY_IMPORT,
  EVT_OPEN_VIRTUAL_COMPANY_COMPANIES,
  installPluginRuntimeHooks,
} from './lib/pluginFrontend';

// 仅初始化一次：把 ProClawPlugin 注入到 window，插件 frontend 才能拿到
initPluginAPI();

/**
 * 把全局 CustomEvent（plugin:virtual-company:open-*）转成 React Router 跳转。
 * 必须在 HashRouter 内才能调用 useNavigate。
 */
function PluginRouteBridge() {
  // 这里用 hash 直接 push；不引入 react-router 的 useNavigate 以保持组件轻量
  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = path;
    }
  };

  useEffect(() => {
    const handlers: Array<[string, () => void]> = [
      [EVT_OPEN_VIRTUAL_COMPANY_WIZARD, () => navigateTo('/vc/wizard')],
      [EVT_OPEN_VIRTUAL_COMPANY_IMPORT, () => navigateTo('/vc/import')],
      [EVT_OPEN_VIRTUAL_COMPANY_COMPANIES, () => navigateTo('/vc/companies')],
    ];
    for (const [evt, fn] of handlers) {
      window.addEventListener(evt, fn);
    }
    return () => {
      for (const [evt, fn] of handlers) {
        window.removeEventListener(evt, fn);
      }
    };
  }, []);

  return null;
}

/**
 * 捕获 /vc/* 的未知路径并尝试通过 ProClawPlugin 路由表跳转（fallback）
 * 实际路由在 main.tsx 中通过 installPluginRuntimeHooks 注入到 React Router
 */
function PluginRouteFallback() {
  const location = useLocation();
  const params = useParams();
  const path = params['*'] || location.pathname;

  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        color: 'text.secondary',
        fontFamily: 'monospace',
      }}
    >
      <h2>🔌 插件路由</h2>
      <p>路径：{path}</p>
      <p style={{ fontSize: '0.85rem', marginTop: 16 }}>
        该路径由 ProClaw 插件动态注册。请通过插件市场或主菜单进入对应页面。
      </p>
    </Box>
  );
}

function App() {
  useEffect(() => {
    // 把 React Router 的 <Route> 注入能力桥接到 ProClawPlugin 的 registerRoute 接口
    installPluginRuntimeHooks(
      (path, component) => {
        // 占位：实际注入在 PluginRouteOutlet 组件中通过 event 桥接
        console.log('[App] Plugin registered route:', path, '| component:', component?.name || 'anonymous');
        // 记录到全局表，由 RouterSwitch 渲染
        if (typeof window !== 'undefined') {
          (window as any).__proclawPluginRoutes = (window as any).__proclawPluginRoutes || {};
          (window as any).__proclawPluginRoutes[path] = component;
          // 触发 React 重新渲染
          window.dispatchEvent(new CustomEvent('plugin:routes-updated'));
        }
      },
      (parent, label, icon, route) => {
        if (typeof window !== 'undefined') {
          const list = (window as any).__proclawPluginMenuItems || [];
          list.push({ parent, label, icon, route });
          (window as any).__proclawPluginMenuItems = list;
          window.dispatchEvent(new CustomEvent('plugin:menu-updated'));
          console.log(`[App] Plugin registered menu: ${parent} > ${label} → ${route}`);
        }
      }
    );
  }, []);

  return (
    <HashRouter>
      <IncomingCallDialog />
      <PluginRouteBridge />
      {/* v13.1.1：删除 LoginDialog 顶层常驻（v11.0 强弹窗逻辑已废） */}
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>}>
        <Routes>
          {renderAppRoutes()}
          {/* 插件路由 fallback：任何 /vc/* 路径都会被这里兜底
              真正的组件渲染通过 PluginRouteOutlet 在外面根据 window.__proclawPluginRoutes 路由 */}
          <Route path="/vc/*" element={<PluginRouteOutlet />} />
          <Route path="*" element={<PluginRouteFallback />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

/**
 * 监听 window.__proclawPluginRoutes 并渲染对应组件
 */
import * as React from 'react';
function PluginRouteOutlet() {
  const location = useLocation();
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener('plugin:routes-updated', onUpdate);
    // 首次挂载也尝试渲染一次
    setTick((t) => t + 1);
    return () => window.removeEventListener('plugin:routes-updated', onUpdate);
  }, []);

  const path = location.pathname;
  const routes = (window as any).__proclawPluginRoutes || {};
  const Component = routes[path];

  if (!Component) {
    return <PluginRouteFallback />;
  }
  return <Component key={path + ':' + tick} />;
}

export default App;