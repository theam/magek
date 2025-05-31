export const template = `import { Booster } from '@booster-ai/core'
import { BoosterConfig } from '@booster-ai/common'

Booster.configure('local', (config: BoosterConfig): void => {
  config.appName = '{{{ projectName }}}'
  config.providerPackage = '@booster-ai/server'
})

Booster.configure('production', (config: BoosterConfig): void => {
  config.appName = '{{{ projectName }}}'
  config.providerPackage = '{{{providerPackageName}}}'
})
`
