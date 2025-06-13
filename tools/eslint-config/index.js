const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const importPlugin = require('eslint-plugin-import')
const prettierPlugin = require('eslint-plugin-prettier')
const unicornPlugin = require('eslint-plugin-unicorn')
const unicorn = require('./unicorn')

module.exports = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        project: 'tsconfig.eslint.json',
        ...unicorn.parserOptions,
      },
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
      semi: ['error', 'never'],
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-parameter-properties': 0,
      '@typescript-eslint/no-floating-promises': 0,
      '@typescript-eslint/array-type': [0, 'generic'],
      '@typescript-eslint/no-use-before-define': 0,
      '@typescript-eslint/no-var-requires': 0,
      '@typescript-eslint/ban-ts-ignore': 0,
      '@typescript-eslint/no-extra-parens': 0,
      '@typescript-eslint/no-extra-semi': 0,
      '@typescript-eslint/no-empty-function': 0,
      '@typescript-eslint/explicit-function-return-type': 0,
      'import/no-extraneous-dependencies': ['error'],
      ...unicorn.rules,
    },
  },
]
