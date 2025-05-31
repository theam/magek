export const template = `import { Booster } from '@booster-ai/core'
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
} from '@booster-ai/core'

Booster.start(__dirname)
`
