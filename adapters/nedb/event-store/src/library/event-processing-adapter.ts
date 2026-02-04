import * as fs from 'fs'
import * as path from 'path'
import { MagekConfig, EventEnvelope, getLogger, getTimestampGenerator, UUID } from '@magek/common'
import { EventRegistry } from '../event-registry'
import { eventProcessingCursorFile } from '../paths'

const originOfTime = new Date(0).toISOString()

interface CursorData {
  cursor: string
}

function readCursor(): string | null {
  try {
    if (!fs.existsSync(eventProcessingCursorFile)) {
      return null
    }
    const data = fs.readFileSync(eventProcessingCursorFile, 'utf-8')
    const cursorData: CursorData = JSON.parse(data)
    return cursorData.cursor
  } catch {
    return null
  }
}

function writeCursor(cursor: string): void {
  const cursorData: CursorData = { cursor }
  // Ensure the directory exists before writing
  const dir = path.dirname(eventProcessingCursorFile)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(eventProcessingCursorFile, JSON.stringify(cursorData, null, 2), 'utf-8')
}

/**
 * Fetches the next batch of unprocessed events.
 * Reads cursor from file and fetches events after that position.
 *
 * @param eventRegistry - The event registry instance
 * @param config - The Magek configuration object
 * @returns An array of EventEnvelope objects
 */
export async function fetchUnprocessedEvents(
  eventRegistry: EventRegistry,
  config: MagekConfig
): Promise<Array<EventEnvelope>> {
  const logger = getLogger(config, 'event-processing-adapter#fetchUnprocessedEvents')
  const cursor = readCursor() ?? originOfTime
  const batchSize = config.eventProcessingBatchSize

  const query = {
    kind: 'event',
    deletedAt: { $exists: false },
    processedAt: { $exists: false },
    createdAt: { $gt: cursor },
  }

  logger.debug(`Fetching events after cursor ${cursor} (batch size: ${batchSize})`)
  const result = await eventRegistry.query(query, 1, batchSize) // Sort ascending by createdAt

  logger.debug(`Fetched ${result.length} unprocessed events`)
  return result as Array<EventEnvelope>
}

/**
 * Marks a single event as processed and advances the cursor.
 *
 * @param eventRegistry - The event registry instance
 * @param config - The Magek configuration object
 * @param eventId - The ID of the event that was processed
 */
export async function markEventProcessed(
  eventRegistry: EventRegistry,
  config: MagekConfig,
  eventId: UUID
): Promise<void> {
  const logger = getLogger(config, 'event-processing-adapter#markEventProcessed')
  const processedAt = getTimestampGenerator().next()

  // Fetch the event to get its createdAt for the cursor
  const eventIdStr = eventId.toString()
  const events = await eventRegistry.query({ _id: eventIdStr })
  if (events.length === 0) {
    logger.warn(`Event ${eventId} not found, cannot mark as processed`)
    return
  }
  const event = events[0] as EventEnvelope

  logger.debug(`Marking event ${eventId} as processed at ${processedAt}`)
  await eventRegistry.markProcessed(eventIdStr, processedAt)

  // Update cursor to this event's createdAt timestamp
  writeCursor(event.createdAt)
  logger.debug(`Cursor advanced to ${event.createdAt}`)
}
