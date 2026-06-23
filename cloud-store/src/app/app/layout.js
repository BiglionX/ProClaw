"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AppRootLayout;
// ProClaw Cloud 托管版 - App 布局（受保护路由的共享布局）
var AppLayout_1 = require("@/components/AppLayout");
function AppRootLayout(_a) {
    var children = _a.children;
    return <AppLayout_1.default>{children}</AppLayout_1.default>;
}
