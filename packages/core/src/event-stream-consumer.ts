import { trace } from './instrumentation'
import { MagekConfig, EventStream, TraceActionTypes, getLogger } from '@magek/common'
import { EventStore } from './services/event-store'
import { ReadModelStore } from './services/read-model-store'
import { RawEventsParser } from './services/raw-events-parser'
import { MagekEventProcessor } from './event-processor'

/**
 * This class consumes events from the event stream and dispatches them to the event handlers
 */
export class MagekEventStreamConsumer {
  @trace(TraceActionTypes.CONSUME_STREAM_EVENTS)
  public static async consume(rawEvents: unknown, config: MagekConfig): Promise<void> {
    const logger = getLogger(config, 'MagekEventDispatcher#dispatch')
    const eventStore = new EventStore(config)
    const readModelStore = new ReadModelStore(config)
    logger.debug(
      'Stream event workflow started for raw events:',
      require('util').inspect(rawEvents, false, null, false)
    )
    try {
      const dedupEvents: EventStream = await config.eventStore.dedupEventStream(config, rawEvents)
      const eventEnvelopes = config.eventStore.rawStreamToEnvelopes(config, rawEvents, dedupEvents)
      await RawEventsParser.streamPerEntityEvents(
        config,
        eventEnvelopes,
        MagekEventProcessor.eventProcessor(eventStore, readModelStore)
      )
    } catch (e) {
      logger.error('Unhandled error while consuming event: ', e)
    }
  }
}
