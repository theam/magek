import { MagekConfig, TraceActionTypes, getLogger } from '@magek/common'
import { EventStore } from './services/event-store'
import { RawEventsParser } from './services/raw-events-parser'
import { ReadModelStore } from './services/read-model-store'
import { trace } from './instrumentation'
import { MagekEventProcessor } from './event-processor'

export class MagekEventDispatcher {
  /**
   * Entry point to dispatch events.
   * @param rawEvents List of raw events
   * @param config
   */
  @trace(TraceActionTypes.DISPATCH_EVENTS)
  public static async dispatch(rawEvents: unknown, config: MagekConfig): Promise<void> {
    const logger = getLogger(config, 'MagekEventDispatcher#dispatch')
    const eventStore = new EventStore(config)
    const readModelStore = new ReadModelStore(config)
    logger.debug('Event workflow started for raw events:', require('util').inspect(rawEvents, false, null, false))
    try {
      const eventEnvelopes = config.eventStore.rawToEnvelopes(rawEvents)
      await RawEventsParser.streamPerEntityEvents(
        config,
        eventEnvelopes,
        MagekEventProcessor.eventProcessor(eventStore, readModelStore)
      )
    } catch (e) {
      logger.error('Unhandled error while dispatching event: ', e)
    }
  }
}
