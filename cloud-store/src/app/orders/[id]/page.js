// ProClaw Cloud 托管版 - 订单详情页面
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OrderDetailPage;
var link_1 = require("next/link");
function OrderDetailPage() {
    return (<div className="container mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">📋</div>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">订单详情</h1>
      <p className="text-gray-600 text-lg mb-8 max-w-lg mx-auto">
        ProClaw Cloud 托管版不提供在线商城订单功能。
        您可以通过销售管理模块管理销售订单。
      </p>
      <link_1.default href="/app/sales" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
        前往销售管理
      </link_1.default>
    </div>);
}
