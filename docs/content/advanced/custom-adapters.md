# Custom Adapters

Magek uses an adapter pattern to abstract away database and storage implementation details. This allows you to use different storage backends without modifying your application code. This guide explains how to create custom adapters for the Magek framework.

## Overview

Magek has three types of adapters:

1. **Event Store Adapter** - Stores events and entity snapshots for event sourcing
2. **Read Model Store Adapter** - Stores and queries read model projections
3. **Session Store Adapter** - Manages WebSocket connections and GraphQL subscriptions

Each adapter type has a well-defined interface that you must implement. The framework provides built-in adapters for NeDB (file-based) and in-memory storage.

## Adapter Interfaces

### Event Store Adapter

The `EventStoreAdapter` interface (defined in `@magek/common`) handles event sourcing operations:

```typescript
interface EventStoreAdapter {
  // Convert raw data to EventEnvelope objects
  rawToEnvelopes(rawEvents: unknown): Array<EventEnvelope>

  // Streaming methods (optional - can throw "not implemented")
  rawStreamToEnvelopes(config: MagekConfig, context: unknown, dedupEventStream: EventStream): Array<EventEnvelope>
  dedupEventStream(config: MagekConfig, rawEvents: unknown): Promise<EventStream>
  produce(entityName: string, entityID: UUID, eventEnvelopes: Array<EventEnvelope>, config: MagekConfig): Promise<void>

  // Core event operations
  forEntitySince(config: MagekConfig, entityTypeName: string, entityID: UUID, since?: string): Promise<Array<EventEnvelope>>
  latestEntitySnapshot(config: MagekConfig, entityTypeName: string, entityID: UUID): Promise<EntitySnapshotEnvelope | undefined>
  store(eventEnvelopes: Array<NonPersistedEventEnvelope>, config: MagekConfig): Promise<Array<EventEnvelope>>
  storeSnapshot(snapshotEnvelope: NonPersistedEntitySnapshotEnvelope, config: MagekConfig): Promise<EntitySnapshotEnvelope>

  // Search and pagination
  search(config: MagekConfig, parameters: EventSearchParameters): Promise<Array<EventSearchResponse>>
  searchEntitiesIDs(config: MagekConfig, limit: number, afterCursor: Record<string, string> | undefined, entityTypeName: string): Promise<PaginatedEntitiesIdsResult>

  // Dispatch tracking
  storeDispatched(eventEnvelope: EventEnvelope, config: MagekConfig): Promise<boolean>

  // Deletion operations
  findDeletableEvent(config: MagekConfig, parameters: EventDeleteParameters): Promise<Array<EventEnvelopeFromDatabase>>
  findDeletableSnapshot(config: MagekConfig, parameters: SnapshotDeleteParameters): Promise<Array<EntitySnapshotEnvelopeFromDatabase>>
  deleteEvent(config: MagekConfig, events: Array<EventEnvelopeFromDatabase>): Promise<void>
  deleteSnapshot(config: MagekConfig, snapshots: Array<EntitySnapshotEnvelopeFromDatabase>): Promise<void>

  // Health check (optional)
  healthCheck?: {
    isUp(config: MagekConfig): Promise<boolean>
    details(config: MagekConfig): Promise<unknown>
    urls(config: MagekConfig): Promise<Array<string>>
  }
}
```

### Read Model Store Adapter

The `ReadModelStoreAdapter` interface handles read model projections:

```typescript
interface ReadModelStoreAdapter {
  // Fetch a specific read model by ID
  fetch<TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModelID: UUID,
    sequenceKey?: SequenceKey
  ): Promise<ReadOnlyNonEmptyArray<TReadModel> | undefined>

  // Search read models with filters, sorting, and pagination
  search<TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    filters: FilterFor<unknown>,
    sortBy?: SortFor<unknown>,
    limit?: number,
    afterCursor?: unknown,
    paginatedVersion?: boolean,
    select?: ProjectionFor<TReadModel>
  ): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>>

  // Store or update a read model
  store<TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModel: ReadModelStoreEnvelope<TReadModel>
  ): Promise<ReadModelStoreEnvelope<TReadModel>>

  // Delete a read model
  delete(config: MagekConfig, readModelName: string, readModelID: UUID): Promise<void>

  // Convert raw data to envelopes
  rawToEnvelopes<TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    rawReadModels: unknown
  ): Promise<Array<ReadModelStoreEnvelope<TReadModel>>>

  // Health check (optional)
  healthCheck?: {
    isUp(config: MagekConfig): Promise<boolean>
    details(config: MagekConfig): Promise<unknown>
    urls(config: MagekConfig): Promise<Array<string>>
  }
}
```

### Session Store Adapter

The `SessionStoreAdapter` interface manages real-time connections:

```typescript
interface SessionStoreAdapter {
  // Connection management
  storeConnection(config: MagekConfig, connectionId: UUID, connectionData: Record<string, any>): Promise<void>
  fetchConnection(config: MagekConfig, connectionId: UUID): Promise<Record<string, any> | undefined>
  deleteConnection(config: MagekConfig, connectionId: UUID): Promise<void>

  // Subscription management
  storeSubscription(config: MagekConfig, connectionId: UUID, subscriptionId: UUID, subscriptionData: Record<string, any>): Promise<void>
  fetchSubscription(config: MagekConfig, subscriptionId: UUID): Promise<Record<string, any> | undefined>
  deleteSubscription(config: MagekConfig, connectionId: UUID, subscriptionId: UUID): Promise<void>

  // Bulk operations
  fetchSubscriptionsForConnection(config: MagekConfig, connectionId: UUID): Promise<Array<Record<string, any>>>
  deleteSubscriptionsForConnection(config: MagekConfig, connectionId: UUID): Promise<void>
  fetchSubscriptionsByClassName(config: MagekConfig, className: string): Promise<Array<SubscriptionEnvelope>>

  // Health check (optional)
  healthCheck?: {
    isUp(config: MagekConfig): Promise<boolean>
    details(config: MagekConfig): Promise<unknown>
    urls(config: MagekConfig): Promise<Array<string>>
  }
}
```

## Implementation Guide

### Package Structure

Create your adapter package with this structure:

```
adapters/<database>/<adapter-type>/
├── src/
│   ├── index.ts              # Export adapter singleton
│   └── <database>-<type>.ts  # Implementation
├── test/
│   ├── expect.ts             # Test utilities
│   └── <adapter>.test.ts     # Tests
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── tsconfig.eslint.json
├── eslint.config.mjs
└── .mocharc.yml
```

### Package Naming Convention

Use this naming pattern: `@magek/adapter-{type}-{database}`

Examples:
- `@magek/adapter-event-store-nedb`
- `@magek/adapter-read-model-store-memory`
- `@magek/adapter-session-store-redis`

### Implementing the Event Store

Key implementation considerations:

1. **Event Storage**: Store events with `kind: 'event'` and snapshots with `kind: 'snapshot'`
2. **Timestamps**: Generate `createdAt` when storing events
3. **Soft Deletes**: Events should be soft-deleted by setting `deletedAt` and clearing `value`
4. **Snapshots**: Hard delete snapshots when requested
5. **Dispatch Tracking**: Track which events have been dispatched to prevent duplicate processing

Example implementation pattern:

```typescript
import { EventStoreAdapter } from '@magek/common'

const eventRegistry = new YourEventRegistry()

export const eventStore: EventStoreAdapter = {
  rawToEnvelopes: (rawEvents) => rawEvents as Array<EventEnvelope>,

  forEntitySince: async (config, entityTypeName, entityID, since) => {
    const query = {
      entityTypeName,
      entityID,
      kind: 'event',
      createdAt: { $gt: since || new Date(0).toISOString() },
      deletedAt: { $exists: false },
    }
    return eventRegistry.query(query)
  },

  store: async (eventEnvelopes, config) => {
    const persisted = []
    for (const envelope of eventEnvelopes) {
      const withTimestamp = { ...envelope, createdAt: new Date().toISOString() }
      await eventRegistry.store(withTimestamp)
      persisted.push(withTimestamp)
    }
    return persisted
  },

  // ... implement other methods
}
```

### Implementing the Read Model Store

Key implementation considerations:

1. **Optimistic Concurrency**: Check version before updates, throw `OptimisticConcurrencyUnexpectedVersionError` on conflicts
2. **Filter Support**: Implement filtering operations (eq, ne, lt, gt, lte, gte, in, contains, etc.)
3. **Sorting**: Support multi-field sorting with ASC/DESC
4. **Pagination**: Implement cursor-based pagination
5. **Field Projection**: Support selecting specific fields

Filter operations to support:

| Operation | Description | Example |
|-----------|-------------|---------|
| `eq` | Equals | `{ name: { eq: 'John' } }` |
| `ne` | Not equals | `{ status: { ne: 'deleted' } }` |
| `lt` | Less than | `{ age: { lt: 18 } }` |
| `gt` | Greater than | `{ price: { gt: 100 } }` |
| `lte` | Less than or equal | `{ age: { lte: 65 } }` |
| `gte` | Greater than or equal | `{ rating: { gte: 4 } }` |
| `in` | In array | `{ status: { in: ['active', 'pending'] } }` |
| `isDefined` | Field exists | `{ email: { isDefined: true } }` |
| `contains` | String contains | `{ name: { contains: 'smith' } }` |
| `beginsWith` | String starts with | `{ name: { beginsWith: 'Dr.' } }` |
| `regex` | Regular expression | `{ email: { regex: '@example.com$' } }` |
| `iRegex` | Case-insensitive regex | `{ name: { iRegex: 'john' } }` |
| `includes` | Array includes | `{ tags: { includes: 'featured' } }` |
| `and` | Logical AND | `{ and: [filter1, filter2] }` |
| `or` | Logical OR | `{ or: [filter1, filter2] }` |
| `not` | Logical NOT | `{ not: { status: { eq: 'deleted' } } }` |

### Implementing the Session Store

Key implementation considerations:

1. **Connection Indexing**: Index connections by ID for fast lookup
2. **Subscription Indexing**: Index subscriptions by connection ID and class name
3. **Cleanup**: Ensure deleting a connection also cleans up its subscriptions
4. **Class Name Queries**: Support fetching subscriptions by read model class name

### Health Checks

Implement health checks to support monitoring:

```typescript
healthCheck: {
  isUp: async (config) => {
    try {
      // Test database connectivity
      await database.ping()
      return true
    } catch {
      return false
    }
  },

  details: async (config) => ({
    type: 'your-database',
    status: 'healthy',
    eventsCount: await database.count('events'),
  }),

  urls: async (config) => ['your-database://connection-string'],
}
```

## Configuration

To use your custom adapter, configure it in your Magek application:

```typescript
import { MagekConfig } from '@magek/core'
import { eventStore } from '@magek/adapter-event-store-your-db'
import { readModelStore } from '@magek/adapter-read-model-store-your-db'
import { sessionStore } from '@magek/adapter-session-store-your-db'

const config = new MagekConfig('production')

// Set custom adapters
;(config as any).eventStoreAdapter = eventStore
;(config as any).readModelStoreAdapter = readModelStore
;(config as any).sessionStoreAdapter = sessionStore
```

## Best Practices

1. **Export Singleton Instances**: Export pre-configured adapter instances for easy usage:
   ```typescript
   export const eventStore: EventStoreAdapter = { /* ... */ }
   ```

2. **Use Logging**: Use `getLogger(config, 'AdapterName#methodName')` for consistent logging

3. **Handle Errors Gracefully**: Wrap database errors in appropriate Magek error types

4. **Support TypeScript**: Export types and use generics where appropriate

5. **Write Comprehensive Tests**: Test all interface methods including edge cases

6. **Document Connection Requirements**: Clearly document any environment variables or configuration needed

## Example Adapters

For reference implementations, see:

- **NeDB Adapters** (file-based): `adapters/nedb/`
- **Memory Adapters** (in-memory): `adapters/memory/`

These implementations demonstrate all required patterns and can serve as templates for your custom adapters.
