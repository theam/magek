import { trace } from './instrumentation'
import { MagekConfig, TraceActionTypes, getLogger } from '@magek/common'
import { RawEventsParser } from './services/raw-events-parser'

/**
 * Produces events to the event stream
 */
export class MagekEventStreamProducer {
  @trace(TraceActionTypes.PRODUCE_STREAM_EVENTS)
  public static async produce(request: unknown, config: MagekConfig): Promise<void> {
    const logger = getLogger(config, 'MagekEventStreamProducer#produce')
    logger.debug('Produce event workflow started for request:', require('util').inspect(request, false, null, false))
    try {
      const eventEnvelopes = config.eventStore.rawToEnvelopes(request)
      await RawEventsParser.streamPerEntityEvents(config, eventEnvelopes, config.eventStore.produce)
    } catch (e) {
      logger.error('Unhandled error while producing events: ', e)
    }
  }
}
