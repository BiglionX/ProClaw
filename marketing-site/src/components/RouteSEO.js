"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// RouteSEO - 路由级 SEO 元数据管理组件
// 在 mount 时更新 document.title 和 meta 标签，unmount 时恢复默认
var react_1 = require("react");
var seoMetadata_1 = require("../config/seoMetadata");
var RouteSEO = function (_a) {
    var routeKey = _a.routeKey, customUrl = _a.customUrl, customImage = _a.customImage;
    (0, react_1.useEffect)(function () {
        var data = seoMetadata_1.seoConfig[routeKey];
        if (!data)
            return;
        var prevTitle = document.title;
        var baseUrl = 'https://proclaw.cc';
        // 更新 title
        document.title = data.title;
        // 更新或创建 meta 标签
        var updateMeta = function (name, content, property) {
            if (property === void 0) { property = false; }
            var attr = property ? 'property' : 'name';
            var el = document.querySelector("meta[".concat(attr, "=\"").concat(name, "\"]"));
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
        return function () {
            document.title = prevTitle;
        };
    }, [routeKey, customUrl, customImage]);
    return null; // 纯逻辑组件，不渲染任何 UI
};
exports.default = RouteSEO;
