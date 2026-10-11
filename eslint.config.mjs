import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "coverage/**",
      "examples/counter/public/pyodide/**",
      "examples/counter/public/wheels/**",
      "playwright-report/**",
      "test-results/**"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["scripts/fixtures/external-consumer/*.js"],
    languageOptions: {
      globals: {
        URL: "readonly",
        document: "readonly",
        globalThis: "readonly",
        location: "readonly",
      },
    },
  },
  {
    files: ["scripts/*.mjs"],
    languageOptions: {
      globals: {
        URL: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    }
  }
);
