import { Booster } from '@booster-ai/core'
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
} from '@booster-ai/core'

Booster.start(__dirname)
