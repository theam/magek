import boosterConfig from './tools/eslint-config/index.js'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/lib/**',
      '**/node_modules/**',
      'packages/create/template/**',
      '**/*.tsbuildinfo'
    ]
  },
  ...boosterConfig
]
