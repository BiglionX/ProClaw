import parserTs from "@typescript-eslint/parser";

export default [
  // 子项目目录排除（它们有自己的 eslint 配置或尚未安装 ESLint）
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-*",
      ".next/**",
      "build/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "target/**",
      "src-tauri/target/**",
      // 子项目目录（它们有独立 eslint 配置）
      "mobile/**",
      "cloud-store/**",
      "marketing-site/**",
      "apps/**",
      // E2E 测试目录
      "e2e/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.{js,mjs,cjs,ts}", "*.{js,mjs,cjs,ts}"],
  },
  {
    languageOptions: {
      globals: {
        React: "readonly",
        process: "readonly",
        __dirname: "readonly",
        ProClawPlugin: "readonly",
      },
      parser: parserTs,
    },
  },
  {
    rules: {
      "no-unreachable": "error",
      "no-unsafe-optional-chaining": "error",
      "no-unsafe-finally": "error",
    },
  },
];