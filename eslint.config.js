import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import customRules from './eslint-custom-rules.js';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', '.vite'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      custom: customRules,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': 'off', // Disabled in favor of custom rule
      'custom/add-public-modifier': 'error',

      // Spacing and formatting rules (non-conflicting with Prettier)
      'lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: false },
      ],
      'newline-before-return': 'error',
      'padding-line-between-statements': [
        'error',
        // Require blank line before and after function declarations/expressions
        {
          blankLine: 'always',
          prev: '*',
          next: ['function', 'class'],
        },
        {
          blankLine: 'always',
          prev: ['function', 'class'],
          next: '*',
        },
        // Require blank line after variable declarations when followed by functions or classes
        {
          blankLine: 'always',
          prev: ['const', 'let', 'var'],
          next: ['function', 'class'],
        },
        // Require blank line before if statements
        {
          blankLine: 'always',
          prev: '*',
          next: 'if',
        },
        // Require blank line before for/while loops
        {
          blankLine: 'always',
          prev: '*',
          next: ['for', 'while', 'do'],
        },
        // Require blank line before switch statements
        {
          blankLine: 'always',
          prev: '*',
          next: 'switch',
        },
        // Require blank line before try/catch blocks
        {
          blankLine: 'always',
          prev: '*',
          next: ['try', 'throw'],
        },
        // Exception: Don't require blank lines between consecutive imports
        {
          blankLine: 'never',
          prev: 'import',
          next: 'import',
        },
        // Exception: Don't require blank lines between consecutive variable declarations
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        // Exception: Allow no blank line at the start of blocks
        {
          blankLine: 'never',
          prev: 'block-like',
          next: '*',
        },
      ],
    },
  },
  // Apply Prettier config last to disable conflicting rules
  prettierConfig
);
