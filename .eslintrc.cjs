module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint', 'react', 'prettier'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // We use TypeScript for type-checking; runtime PropTypes are redundant.
    'react/prop-types': 'off',
    // This codebase intentionally uses `any` in a few places (e.g. charting payloads).
    // Prefer tightening types over time, but don't block CI on it.
    '@typescript-eslint/no-explicit-any': 'off',
    'react/react-in-jsx-scope': 'off',
    // Formatting is handled by Prettier directly; don't fail lint on formatting drift.
    'prettier/prettier': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}
