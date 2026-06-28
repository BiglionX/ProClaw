/**
 * ESLint v9 flat config - ProClaw Mobile
 * P1-7 任务：no-console + import/order 规则
 *
 * 当前 mobile 尚未安装 ESLint（依赖最小化原则），
 * 此配置文件作为未来 `npm install eslint` 后的规范定义。
 * 兜底扫描见 scripts/lint-no-console.js（无需 ESLint 即可执行）。
 */
export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-*',
      'android/**',
      'assets/**',
      '__mocks__/**',
      '**/__tests__/**',
      'scripts/**',
      '*.config.js',
      '*.config.ts',
      'babel.config.js',
      'metro.config.js',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'App.tsx', 'index.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        __DEV__: 'readonly',
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      // P1-7: 禁止直接使用 console.*，统一走 utils/logger
      'no-console': 'error',

      // P1-7: import 分组排序（外部 -> 内部 -> 相对）
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];
