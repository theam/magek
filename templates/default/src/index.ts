import { Booster } from '@magek/core'
export {
  Booster,
  boosterEventDispatcher,
  boosterProduceEventStream,
  boosterConsumeEventStream,
  boosterServeGraphQL,
  boosterNotifySubscribers,
  boosterHealth,
  boosterTriggerScheduledCommand,
  boosterRocketDispatcher,
} from '@magek/core'

Booster.start(__dirname)