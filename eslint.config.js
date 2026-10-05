import js from '@eslint/js'
import ts from 'typescript-eslint'
import react from 'eslint-plugin-react'

export default [
  { ignores: ['**/dist/**', 'docs/.vitepress/dist/**', 'docs/.vitepress/cache/**', 'packages/cli/src/templates/**', 'node_modules/**', '.agents/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
    },
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly', document: 'readonly', setTimeout: 'readonly' },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
