import { Magek } from '@magek/core'
export {
  Magek,
  boosterEventDispatcher,
  boosterProduceEventStream,
  boosterConsumeEventStream,
  boosterServeGraphQL,
  boosterNotifySubscribers,
  boosterHealth,
  boosterTriggerScheduledCommand,
  boosterRocketDispatcher,
} from '@magek/core'

Magek.start(__dirname)