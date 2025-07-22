import { Booster } from '@booster-ai/core'
import { BoosterConfig } from '@booster-ai/common'
import { Provider } from '@booster-ai/server'
import { eventStore } from '@magek/adapter-event-store-nedb'

Booster.configure('local', (config: BoosterConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.provider = Provider()
  config.eventStoreAdapter = eventStore
})

Booster.configure('production', (config: BoosterConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.provider = Provider()
  config.eventStoreAdapter = eventStore
})