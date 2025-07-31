import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  graphQLDispatcher,
  triggerScheduledCommands,
  boosterNotifySubscribers,
  boosterRocketDispatcher,
  boosterConsumeEventStream,
  boosterProduceEventStream,
  boosterHealth,
} from '@magek/core'

Magek.start(__dirname)
