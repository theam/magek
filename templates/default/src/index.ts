import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  produceEventStream,
  consumeEventStream,
  graphQLDispatcher,
  notifySubscribers,
  health,
  triggerScheduledCommands,
  rocketDispatcher,
} from '@magek/core'

Magek.start(__dirname)
