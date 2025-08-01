import rootConfig from '../../../eslint.config.mjs'

export default [
  ...rootConfig,
  {
    files: ['**/*.ts'],
    ignores: ['dist/**/*'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json'
      }
    }
  }
]