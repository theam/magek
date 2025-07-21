import { Magek } from '@magek/core'
export {
  Magek,
  boosterEventDispatcher,
  boosterServeGraphQL,
  boosterTriggerScheduledCommands,
  boosterNotifySubscribers,
  boosterRocketDispatcher,
  boosterConsumeEventStream,
  boosterProduceEventStream,
  boosterHealth,
} from '@magek/core'

Magek.start(__dirname)
