import { Booster } from '@booster-ai/core'
import { BoosterConfig } from '@booster-ai/common'
import { Provider, eventStoreAdapter } from '@booster-ai/server'

Booster.configure('local', (config: BoosterConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.provider = Provider()
  config.eventStoreAdapter = eventStoreAdapter
})

Booster.configure('production', (config: BoosterConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.provider = Provider()
  config.eventStoreAdapter = eventStoreAdapter
})