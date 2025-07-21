import { Booster } from '@magek/core'
import { BoosterConfig } from '@magek/common'
import { Provider } from '@magek/server'
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