import { BoosterConfig, EventDeleteParameters } from '@booster-ai/common'
import { ReadModelStore } from './services/read-model-store'

export class BoosterDeleteEventDispatcher {
  public static async deleteEvent(config: BoosterConfig, parameters: EventDeleteParameters): Promise<boolean> {
    const readModelStore = new ReadModelStore(config)
    const events = await config.eventStore.findDeletableEvent(config, parameters)
    if (!events || events.length === 0) {
      return false
    }
    for (const event of events) {
      const snapshots = await config.eventStore.findDeletableSnapshot(config, event)
      for (const snapshot of snapshots) {
        await readModelStore.project(snapshot, true)
      }
      await config.eventStore.deleteSnapshot(config, snapshots)
    }
    await config.eventStore.deleteEvent(config, events)
    return true
  }
}
