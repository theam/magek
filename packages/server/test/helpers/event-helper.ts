import { EntitySnapshotEnvelope, EventEnvelope, NonPersistedEventEnvelope } from '@magek/common'
import { faker } from '@faker-js/faker'

export function createMockNonPersistedEventEnvelop(): NonPersistedEventEnvelope {
  return createMockNonPersistedEventEnvelopeForEntity(faker.lorem.word(), faker.string.uuid())
}

export function createMockNonPersistedEventEnvelopeForEntity(
  entityTypeName: string,
  entityID: string
): NonPersistedEventEnvelope {
  return {
    kind: 'event',
    superKind: 'domain',
    entityID: entityID,
    entityTypeName: entityTypeName,
    value: {
      id: faker.string.uuid(),
    },
    requestID: faker.string.uuid(),
    typeName: faker.lorem.word(),
    version: faker.number.int(),
    createdAt: faker.date.past().toISOString(),
  }
}

export function createMockEventEnvelope(): EventEnvelope {
  return createMockEventEnvelopeForEntity(faker.lorem.word(), faker.string.uuid())
}

export function createMockEventEnvelopeForEntity(entityTypeName: string, entityID: string): EventEnvelope {
  return {
    kind: 'event',
    superKind: 'domain',
    entityID: entityID,
    entityTypeName: entityTypeName,
    value: {
      id: faker.string.uuid(),
    },
    createdAt: faker.date.past().toISOString(),
    requestID: faker.string.uuid(),
    typeName: faker.lorem.word(),
    version: faker.number.int(),
  }
}

export function createMockEntitySnapshotEnvelope(entityTypeName?: string, entityId?: string): EntitySnapshotEnvelope {
  const creationDate = faker.date.past()
  const snapshottedEventCreatedAt = creationDate.toISOString()
  return {
    kind: 'snapshot',
    superKind: 'domain',
    entityID: entityId ?? faker.string.uuid(),
    entityTypeName: entityTypeName ?? faker.lorem.word(),
    value: {
      id: faker.string.uuid(),
    },
    createdAt: snapshottedEventCreatedAt,
    persistedAt: new Date(creationDate.getTime() + 1000).toISOString(),
    requestID: faker.string.uuid(),
    typeName: faker.lorem.word(),
    version: faker.number.int(),
    snapshottedEventCreatedAt,
  }
}
