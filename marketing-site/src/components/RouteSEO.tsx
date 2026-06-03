// RouteSEO - 路由级 SEO 元数据管理组件
// 在 mount 时更新 document.title 和 meta 标签，unmount 时恢复默认
import React, { useEffect } from 'react';
import { seoConfig, type RouteKey } from '../config/seoMetadata';

interface RouteSEOProps {
  routeKey: RouteKey;
  /** 可选：覆盖 og:url */
  customUrl?: string;
  /** 可选：覆盖 og:image */
  customImage?: string;
}

const RouteSEO: React.FC<RouteSEOProps> = ({ routeKey, customUrl, customImage }) => {
  useEffect(() => {
    const data = seoConfig[routeKey];
    if (!data) return;

    const prevTitle = document.title;
    const baseUrl = 'https://proclaw.cc';

    // 更新 title
    document.title = data.title;

    // 更新或创建 meta 标签
    const updateMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    updateMeta('description', data.description);
    updateMeta('keywords', data.keywords);
    updateMeta('og:title', data.ogTitle, true);
    updateMeta('og:description', data.ogDescription, true);
    updateMeta('og:url', customUrl || baseUrl, true);
    if (customImage) {
      updateMeta('og:image', customImage, true);
    }
    updateMeta('twitter:title', data.ogTitle);
    updateMeta('twitter:description', data.ogDescription);

    // 恢复默认值
    return () => {
      document.title = prevTitle;
    };
  }, [routeKey, customUrl, customImage]);

  return null; // 纯逻辑组件，不渲染任何 UI
};

export default RouteSEO;
