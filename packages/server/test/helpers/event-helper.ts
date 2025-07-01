import { EntitySnapshotEnvelope, EventEnvelope, NonPersistedEventEnvelope } from '@booster-ai/common'
import { faker } from '@faker-js/faker'

export function createMockNonPersistedEventEnvelop(): NonPersistedEventEnvelope {
  return createMockNonPersistedEventEnvelopeForEntity(faker.lorem.word(), faker.datatype.uuid())
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
      id: faker.datatype.uuid(),
    },
    requestID: faker.datatype.uuid(),
    typeName: faker.lorem.word(),
    version: faker.datatype.number(),
  }
}

export function createMockEventEnvelope(): EventEnvelope {
  return createMockEventEnvelopeForEntity(faker.lorem.word(), faker.datatype.uuid())
}

export function createMockEventEnvelopeForEntity(entityTypeName: string, entityID: string): EventEnvelope {
  return {
    kind: 'event',
    superKind: 'domain',
    entityID: entityID,
    entityTypeName: entityTypeName,
    value: {
      id: faker.datatype.uuid(),
    },
    createdAt: faker.date.past().toISOString(),
    requestID: faker.datatype.uuid(),
    typeName: faker.lorem.word(),
    version: faker.datatype.number(),
  }
}

export function createMockEntitySnapshotEnvelope(entityTypeName?: string, entityId?: string): EntitySnapshotEnvelope {
  const creationDate = faker.date.past()
  const snapshottedEventCreatedAt = creationDate.toISOString()
  return {
    kind: 'snapshot',
    superKind: 'domain',
    entityID: entityId ?? faker.datatype.uuid(),
    entityTypeName: entityTypeName ?? faker.lorem.word(),
    value: {
      id: faker.datatype.uuid(),
    },
    createdAt: snapshottedEventCreatedAt,
    persistedAt: new Date(creationDate.getTime() + 1000).toISOString(),
    requestID: faker.datatype.uuid(),
    typeName: faker.lorem.word(),
    version: faker.datatype.number(),
    snapshottedEventCreatedAt,
  }
}
