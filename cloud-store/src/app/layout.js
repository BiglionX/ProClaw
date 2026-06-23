"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewport = exports.metadata = void 0;
exports.default = RootLayout;
var google_1 = require("next/font/google");
require("./globals.css");
var geistSans = (0, google_1.Geist)({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
var geistMono = (0, google_1.Geist_Mono)({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
exports.metadata = {
    title: "ProClaw Cloud - 云端经营管理系统",
    description: "ProClaw Cloud 托管版，无需安装，按量付费。为中小商户提供云端进销存、AI 助手、智能经营的一站式解决方案。",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "ProClaw Cloud",
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/favicon.ico",
    },
};
exports.viewport = {
    themeColor: "#2563eb",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};
function RootLayout(_a) {
    var children = _a.children;
    return (<html lang="zh-CN" className={"".concat(geistSans.variable, " ").concat(geistMono.variable, " h-full antialiased")}>
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{
            __html: "\n              if ('serviceWorker' in navigator) {\n                window.addEventListener('load', () => {\n                  navigator.serviceWorker.register('/sw.js');\n                });\n              }\n            ",
        }}/>
        {children}
      </body>
    </html>);
}
