import magekConfig from './tools/eslint-config/index.js'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/lib/**',
      '**/node_modules/**',
      'packages/create/template/**',
      'packages/e2e-tests/fixtures/**',
      '**/*.tsbuildinfo'
    ]
  },
  ...magekConfig
]
