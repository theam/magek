import { Magek } from '@magek/core'
import { MagekConfig } from '@magek/common'
import { Provider } from '@magek/server'
import { eventStore } from '@magek/adapter-event-store-nedb'

Magek.configure('local', (config: MagekConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.provider = Provider()
  config.eventStoreAdapter = eventStore
})

Magek.configure('production', (config: MagekConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.provider = Provider()
  config.eventStoreAdapter = eventStore
})