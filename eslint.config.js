import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import path from 'path'
import { fileURLToPath } from 'url'
import reactRefresh from 'eslint-plugin-react-refresh'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
})

export default [
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier'
  ),
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/react-in-jsx-scope': 'off',
      'prettier/prettier': 'off',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/use-memo-deps': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/gating': 'off',
      'react-hooks/component-hook-factories': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/config': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'prefer-const': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      '.eslintrc.cjs',
      'public/sw-push.js',
      'supabase/functions/**',
    ],
  },
]
