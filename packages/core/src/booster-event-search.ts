import {
  BoosterConfig,
  EventMetadata,
  EventSearchParameters,
  EventSearchResponse,
  NotificationMetadata,
  createInstance,
  getLogger,
} from '@booster-ai/common'

export async function eventSearch(
  config: BoosterConfig,
  request: EventSearchParameters
): Promise<Array<EventSearchResponse>> {
  const events: Array<EventSearchResponse> = await config.eventStore.search(config, request)
  return events.map((event) => createEventValueInstance(config, event))
}

function createEventValueInstance(config: BoosterConfig, event: EventSearchResponse): EventSearchResponse {
  const logger = getLogger(config, 'booster-event-search#createEventValueInstance')
  const eventMetadata: EventMetadata = config.events[event.type]
  if (eventMetadata) {
    event.value = createInstance(eventMetadata.class, event.value)
    logger.debug(`Found @Event for "${event.type}". Created value instance`)
    return event
  }
  const notificationMetadata: NotificationMetadata = config.notifications[event.type]
  if (notificationMetadata) {
    event.value = createInstance(notificationMetadata.class, event.value)
    logger.debug(`Found @Notification for "${event.type}"`)
  } else {
    logger.warn(`Could not find @Event or @Notification class for "${event.type}". Returned the event as it was`)
  }
  return event
}
