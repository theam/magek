import { UserApp, MagekConfig, getLogger } from '@magek/common'

let pollingTimer: NodeJS.Timeout | null = null
let currentPollPromise: Promise<void> | null = null

/**
 * Starts the event polling loop.
 * Polls for unprocessed events and dispatches them via eventDispatcher.
 *
 * @param userApp - The user's Magek application module
 * @param config - The Magek configuration object
 */
export function startEventPolling(userApp: UserApp, config: MagekConfig): void {
  const logger = getLogger(config, 'EventPoller')
  const intervalMs = config.eventPollingIntervalMs

  logger.info(`Starting event polling every ${intervalMs}ms (batch size: ${config.eventProcessingBatchSize})`)

  pollingTimer = setInterval(() => {
    // Store the promise so tests can await it
    currentPollPromise = pollAndProcessEvents(userApp, config, logger)
  }, intervalMs)
}

/**
 * Waits for the current poll cycle to complete.
 * Exported for tests to ensure async poll callbacks finish before assertions.
 */
export async function waitForCurrentPoll(): Promise<void> {
  if (currentPollPromise) {
    await currentPollPromise
  }
}

/**
 * Stops the event polling loop.
 */
export function stopEventPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
  currentPollPromise = null
}

async function pollAndProcessEvents(userApp: UserApp, config: MagekConfig, logger: ReturnType<typeof getLogger>): Promise<void> {
  const eventStore = config.eventStore

  // Check if adapter supports async processing
  if (!eventStore.fetchUnprocessedEvents || !eventStore.markEventProcessed) {
    return
  }

  try {
    const events = await eventStore.fetchUnprocessedEvents(config)

    if (events.length === 0) {
      return
    }

    logger.debug(`Processing ${events.length} events`)

    // Process each event individually
    for (const event of events) {
      try {
        // Dispatch the event
        await userApp.eventDispatcher([event])

        // Mark as processed only after successful dispatch
        if (event.id) {
          await eventStore.markEventProcessed(config, event.id)
        }
      } catch (error) {
        logger.error(`Error processing event ${event.id}:`, error)
        // Stop processing on first error to maintain order
        break
      }
    }
  } catch (error) {
    logger.error('Error during event polling:', error)
  }
}
