import { Trace } from './instrumentation/index.js'
import { BoosterConfig, EventStream, TraceActionTypes, getLogger } from '@booster-ai/common'
import { EventStore } from './services/event-store.js'
import { ReadModelStore } from './services/read-model-store.js'
import { RawEventsParser } from './services/raw-events-parser.js'
import { BoosterEventProcessor } from './booster-event-processor.js'

/**
 * This class consumes events from the event stream and dispatches them to the event handlers
 */
export class BoosterEventStreamConsumer {
  @Trace(TraceActionTypes.CONSUME_STREAM_EVENTS)
  public static async consume(rawEvents: unknown, config: BoosterConfig): Promise<void> {
    const logger = getLogger(config, 'BoosterEventDispatcher#dispatch')
    const eventStore = new EventStore(config)
    const readModelStore = new ReadModelStore(config)
    logger.debug(
      'Stream event workflow started for raw events:',
      require('util').inspect(rawEvents, false, null, false)
    )
    try {
      const dedupEvents: EventStream = await config.provider.events.dedupEventStream(config, rawEvents)
      const eventEnvelopes = config.provider.events.rawStreamToEnvelopes(config, rawEvents, dedupEvents)
      await RawEventsParser.streamPerEntityEvents(
        config,
        eventEnvelopes,
        BoosterEventProcessor.eventProcessor(eventStore, readModelStore)
      )
    } catch (e) {
      logger.error('Unhandled error while consuming event: ', e)
    }
  }
}
