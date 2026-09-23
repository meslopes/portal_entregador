import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import quality from './eslint-rules/index.cjs'

export default [
  { ignores: ['dist', 'build', 'coverage', 'node_modules', '.vite', '.playwright-cli', '.mimocode', 'dev'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // Vite / bundler-provided Node-like globals
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setImmediate: 'readonly',
        // ES2021+ built-in
        AggregateError: 'readonly',
        // React DevTools browser extension
        __REACT_DEVTOOLS_GLOBAL_HOOK__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Quality gates
    files: ['src/**/*.{js,jsx}'],
    plugins: { quality },
    rules: {
      'quality/max-lines': ['error', { max: 350 }],
    },
  },
  {
    // Test files: relaxed budget
    files: ['**/*.test.{js,jsx}', '**/{__tests__,__mocks__,fixtures,mocks}/**/*.{js,jsx}'],
    plugins: { quality },
    rules: {
      'quality/max-lines': ['warn', { includeTests: true }],
    },
  },
  {
    files: ['eslint-rules/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'readonly', require: 'readonly' },
    },
  },
  {
    // Node.js config files (Vite, etc.)
    files: ['vite.config.js', '*.config.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
  {
    // Service worker files
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        importScripts: 'readonly',
        firebase: 'readonly',
        clients: 'readonly',
      },
    },
  },
]
