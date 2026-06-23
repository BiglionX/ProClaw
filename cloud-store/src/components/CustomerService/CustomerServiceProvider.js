// ProClaw Cloud 托管版 - AI 客服 Provider 组件
// 封装 ChatWidget，自动从认证状态获取 tenant_id
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CustomerServiceProvider;
var dynamic_1 = require("next/dynamic");
var auth_store_1 = require("@/lib/auth-store");
// 动态导入 ChatWidget（减少初始 bundle 体积）
var ChatWidget = (0, dynamic_1.default)(function () { return Promise.resolve().then(function () { return require('@/components/CustomerService/ChatWidget'); }); }, { ssr: false });
function CustomerServiceProvider(_a) {
    var externalTenantId = _a.tenantId;
    var user = (0, auth_store_1.useAuthStore)().user;
    // 优先使用外部传入的 tenant_id，其次是认证用户的 ID
    var effectiveTenantId = externalTenantId || (user === null || user === void 0 ? void 0 : user.id);
    if (!effectiveTenantId)
        return null;
    return <ChatWidget tenantId={effectiveTenantId}/>;
}
