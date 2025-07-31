import { Magek } from '@magek/core'
export {
  Magek,
  eventDispatcher,
  boosterServeGraphQL,
  boosterTriggerScheduledCommands,
  boosterNotifySubscribers,
  boosterRocketDispatcher,
  boosterConsumeEventStream,
  boosterProduceEventStream,
  boosterHealth,
} from '@magek/core'

Magek.start(__dirname)
