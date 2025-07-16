import { BoosterConfig, EventDeleteParameters } from '@booster-ai/common'
import { ReadModelStore } from './services/read-model-store'

export class BoosterDeleteEventDispatcher {
  public static async deleteEvent(config: BoosterConfig, parameters: EventDeleteParameters): Promise<boolean> {
    if (!config.eventStoreAdapter) {
      throw new Error('EventStoreAdapter is not configured. Please set config.eventStoreAdapter.')
    }
    const readModelStore = new ReadModelStore(config)
    const events = await config.eventStoreAdapter.findDeletableEvent(config, parameters)
    if (!events || events.length === 0) {
      return false
    }
    for (const event of events) {
      const snapshots = await config.eventStoreAdapter.findDeletableSnapshot(config, event)
      for (const snapshot of snapshots) {
        await readModelStore.project(snapshot, true)
      }
      await config.eventStoreAdapter.deleteSnapshot(config, snapshots)
    }
    await config.eventStoreAdapter.deleteEvent(config, events)
    return true
  }
}
