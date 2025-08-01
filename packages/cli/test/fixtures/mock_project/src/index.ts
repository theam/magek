import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  graphQLDispatcher,
  triggerScheduledCommands,
  notifySubscribers,
  rocketDispatcher,
  boosterConsumeEventStream,
  boosterProduceEventStream,
  boosterHealth,
} from '@magek/core'

Magek.start(__dirname)
