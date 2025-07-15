import { EventStoreAdapter, UserApp } from '@booster-ai/common'
import {
  rawEventsToEnvelopes,
  readEntityEventsSince,
  readEntityLatestSnapshot,
  storeEvents,
  storeSnapshot,
  storeDispatchedEvent,
} from './library/events-adapter'
import { searchEntitiesIds, searchEvents } from './library/events-search-adapter'
import {
  deleteEvent,
  deleteSnapshot,
  findDeletableEvent,
  findDeletableSnapshot,
} from './library/event-delete-adapter'
import { EventRegistry } from './event-registry'

export * from './library/events-adapter'
export * from './library/events-search-adapter'
export * from './library/event-delete-adapter'

const userApp: UserApp = require(require('path').join(process.cwd(), 'dist', 'index.js'))
const eventRegistry = new EventRegistry()

export const eventStore: EventStoreAdapter = {
  rawToEnvelopes: rawEventsToEnvelopes,
  rawStreamToEnvelopes: () => [],
  dedupEventStream: async () => [],
  produce: async () => {},
  forEntitySince: readEntityEventsSince.bind(null, eventRegistry),
  latestEntitySnapshot: readEntityLatestSnapshot.bind(null, eventRegistry),
  store: storeEvents.bind(null, userApp, eventRegistry),
  storeSnapshot: storeSnapshot.bind(null, eventRegistry),
  search: searchEvents.bind(null, eventRegistry),
  searchEntitiesIDs: searchEntitiesIds.bind(null, eventRegistry),
  storeDispatched: storeDispatchedEvent,
  findDeletableEvent: findDeletableEvent.bind(null, eventRegistry),
  findDeletableSnapshot: findDeletableSnapshot.bind(null, eventRegistry),
  deleteEvent: deleteEvent.bind(null, eventRegistry),
  deleteSnapshot: deleteSnapshot.bind(null, eventRegistry),
}
