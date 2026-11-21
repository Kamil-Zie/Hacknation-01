// T-001 Shared ESLint flat config (coding-standard sections 1-3)
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const importOrder = {
  groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
  pathGroups: [{ pattern: '@/**', group: 'internal' }],
  pathGroupsExcludedImportTypes: ['builtin', 'external'],
  'newlines-between': 'always',
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '.claude/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            'apps/frontend/tsconfig.json',
            'apps/backend/tsconfig.json',
            'database/tsconfig.json',
          ],
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'import/order': ['error', importOrder],
      'import/no-default-export': 'error',
    },
  },
  {
    files: ['apps/frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, 'no-console': 'error' },
  },
  {
    files: ['apps/backend/**/*.ts', 'database/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'warn' },
  },
  {
    files: ['**/*.config.{js,ts}', 'eslint.config.js'],
    rules: { 'import/no-default-export': 'off' },
  },
);
