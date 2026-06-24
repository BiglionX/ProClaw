import globals from "globals";
import parserTs from "@typescript-eslint/parser";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
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
