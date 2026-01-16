import { Magek } from '@magek/core'
import { MagekConfig } from '@magek/common'
import { ServerRuntime } from '@magek/server'
import { eventStore } from '@magek/adapter-event-store-nedb'
import { readModelStore } from '@magek/adapter-read-model-store-nedb'
import { sessionStore } from '@magek/adapter-session-store-nedb'

Magek.configure('local', (config: MagekConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.runtime = ServerRuntime
  config.eventStoreAdapter = eventStore
  config.readModelStoreAdapter = readModelStore
  config.sessionStoreAdapter = sessionStore
})

Magek.configure('production', (config: MagekConfig): void => {
  config.appName = '{{PROJECT_NAME}}'
  config.runtime = ServerRuntime
  config.eventStoreAdapter = eventStore
  config.readModelStoreAdapter = readModelStore
  config.sessionStoreAdapter = sessionStore
})
