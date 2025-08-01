import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  graphQLDispatcher,
  triggerScheduledCommands,
  notifySubscribers,
  rocketDispatcher,
  consumeEventStream,
  boosterProduceEventStream,
  boosterHealth,
} from '@magek/core'

Magek.start(__dirname)
