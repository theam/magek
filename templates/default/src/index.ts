import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  boosterProduceEventStream,
  boosterConsumeEventStream,
  boosterServeGraphQL,
  boosterNotifySubscribers,
  boosterHealth,
  boosterTriggerScheduledCommand,
  boosterRocketDispatcher,
} from '@magek/core'

Magek.start(__dirname)