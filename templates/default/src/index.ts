import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  boosterProduceEventStream,
  consumeEventStream,
  graphQLDispatcher,
  notifySubscribers,
  boosterHealth,
  boosterTriggerScheduledCommand,
  rocketDispatcher,
} from '@magek/core'

Magek.start(__dirname)