import { Booster } from '@magek/core'
export {
  Booster,
  boosterEventDispatcher,
  boosterServeGraphQL,
  boosterTriggerScheduledCommands,
  boosterNotifySubscribers,
  boosterRocketDispatcher,
  boosterConsumeEventStream,
  boosterProduceEventStream,
  boosterHealth,
} from '@magek/core'

Booster.start(__dirname)
