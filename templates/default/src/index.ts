import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  boosterProduceEventStream,
  boosterConsumeEventStream,
  graphQLDispatcher,
  boosterNotifySubscribers,
  boosterHealth,
  boosterTriggerScheduledCommand,
  boosterRocketDispatcher,
} from '@magek/core'

Magek.start(__dirname)