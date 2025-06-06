import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

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
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit',
          overrides: {
            accessors: 'explicit',
            constructors: 'explicit',
            methods: 'explicit',
            properties: 'explicit',
            parameterProperties: 'explicit',
          },
        },
      ],
      'padding-line-between-statements': [
        'error',
        // Require blank line before if statements (but not after opening braces)
        {
          blankLine: 'always',
          prev: ['*'],
          next: 'if',
        },
        // Require blank line before function declarations
        {
          blankLine: 'always',
          prev: '*',
          next: 'function',
        },
        // Require blank line after function declarations
        {
          blankLine: 'always',
          prev: 'function',
          next: '*',
        },
        // Exception: Don't require blank lines between consecutive imports
        {
          blankLine: 'never',
          prev: 'import',
          next: 'import',
        },
        // Exception: Don't require blank lines at the start of blocks
        {
          blankLine: 'never',
          prev: 'block-like',
          next: '*',
        },
        // Exception: Allow no blank line after variable declarations when followed by related code
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: '*',
        },
      ],
    },
  }
);
