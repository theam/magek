import { Magek } from '@magek/core'
import { MagekConfig } from '@magek/common'

Magek.configure('local', (config: MagekConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.providerPackage = '@magek/server'
})

Magek.configure('production', (config: MagekConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.providerPackage = '@magek/server'
})