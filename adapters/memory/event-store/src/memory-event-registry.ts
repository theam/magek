import {
  EntitySnapshotEnvelope,
  EventEnvelope,
  UUID,
} from '@magek/common'

export class MemoryEventRegistry {
  private events: Map<string, EventEnvelope> = new Map()
  private snapshots: Map<string, EntitySnapshotEnvelope> = new Map()
  private dispatched: Set<string> = new Set()
  private eventsByEntity: Map<string, Set<string>> = new Map()
  private snapshotsByEntity: Map<string, Set<string>> = new Map()
  private eventIdCounter = 0
  private snapshotIdCounter = 0

  private generateEventId(): string {
    return `evt-${++this.eventIdCounter}-${Date.now()}`
  }

  private generateSnapshotId(): string {
    return `snap-${++this.snapshotIdCounter}-${Date.now()}`
  }

  private getEntityKey(entityTypeName: string, entityID: UUID): string {
    return `${entityTypeName}:${entityID}`
  }

  public async query(
    query: QueryFilter,
    sortOrder: 'asc' | 'desc' = 'asc',
    limit?: number
  ): Promise<Array<EventEnvelope | EntitySnapshotEnvelope>> {
    const results: Array<EventEnvelope | EntitySnapshotEnvelope> = []

    // Query events
    if (!query.kind || query.kind === 'event') {
      for (const event of Array.from(this.events.values())) {
        if (this.matchesFilter(event, query)) {
          results.push(event)
        }
      }
    }

    // Query snapshots
    if (query.kind === 'snapshot') {
      for (const snapshot of Array.from(this.snapshots.values())) {
        if (this.matchesFilter(snapshot, query)) {
          results.push(snapshot)
        }
      }
    }

    // Sort by createdAt
    results.sort((a, b) => {
      const aTime = new Date((a as EventEnvelope).createdAt ?? 0).getTime()
      const bTime = new Date((b as EventEnvelope).createdAt ?? 0).getTime()
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
    })

    // Apply limit
    if (limit && limit > 0) {
      return results.slice(0, limit)
    }

    return results
  }

  public async queryLatestSnapshot(query: QueryFilter): Promise<EntitySnapshotEnvelope | undefined> {
    const matchingSnapshots: EntitySnapshotEnvelope[] = []

    for (const snapshot of Array.from(this.snapshots.values())) {
      if (this.matchesFilter(snapshot, { ...query, kind: 'snapshot' })) {
        matchingSnapshots.push(snapshot)
      }
    }

    if (matchingSnapshots.length === 0) {
      return undefined
    }

    // Sort by snapshottedEventCreatedAt descending and return the first one
    matchingSnapshots.sort((a, b) => {
      const aTime = new Date(a.snapshottedEventCreatedAt).getTime()
      const bTime = new Date(b.snapshottedEventCreatedAt).getTime()
      return bTime - aTime
    })

    return matchingSnapshots[0]
  }

  public async store(envelope: EventEnvelope | EntitySnapshotEnvelope): Promise<string> {
    if (envelope.kind === 'event') {
      const eventEnvelope = envelope as EventEnvelope
      const id = this.generateEventId()
      const storedEnvelope = { ...eventEnvelope, id }
      this.events.set(id, storedEnvelope)

      // Index by entity
      const entityKey = this.getEntityKey(eventEnvelope.entityTypeName, eventEnvelope.entityID)
      if (!this.eventsByEntity.has(entityKey)) {
        this.eventsByEntity.set(entityKey, new Set())
      }
      this.eventsByEntity.get(entityKey)!.add(id)

      return id
    } else {
      const snapshotEnvelope = envelope as EntitySnapshotEnvelope
      const id = this.generateSnapshotId()
      const storedEnvelope = { ...snapshotEnvelope, id }
      this.snapshots.set(id, storedEnvelope)

      // Index by entity
      const entityKey = this.getEntityKey(snapshotEnvelope.entityTypeName, snapshotEnvelope.entityID)
      if (!this.snapshotsByEntity.has(entityKey)) {
        this.snapshotsByEntity.set(entityKey, new Set())
      }
      this.snapshotsByEntity.get(entityKey)!.add(id)

      return id
    }
  }

  public async storeDispatched(eventId: string): Promise<boolean> {
    if (this.dispatched.has(eventId)) {
      return false
    }
    this.dispatched.add(eventId)
    return true
  }

  public async replaceOrDeleteItem(id: string, newValue?: EventEnvelope | EntitySnapshotEnvelope): Promise<void> {
    // Check in events
    if (this.events.has(id)) {
      if (newValue) {
        this.events.set(id, newValue as EventEnvelope)
      } else {
        const event = this.events.get(id)!
        const entityKey = this.getEntityKey(event.entityTypeName, event.entityID)
        this.eventsByEntity.get(entityKey)?.delete(id)
        this.events.delete(id)
      }
      return
    }

    // Check in snapshots
    if (this.snapshots.has(id)) {
      if (newValue) {
        this.snapshots.set(id, newValue as EntitySnapshotEnvelope)
      } else {
        const snapshot = this.snapshots.get(id)!
        const entityKey = this.getEntityKey(snapshot.entityTypeName, snapshot.entityID)
        this.snapshotsByEntity.get(entityKey)?.delete(id)
        this.snapshots.delete(id)
      }
    }
  }

  public async deleteAll(): Promise<number> {
    const count = this.events.size + this.snapshots.size
    this.events.clear()
    this.snapshots.clear()
    this.dispatched.clear()
    this.eventsByEntity.clear()
    this.snapshotsByEntity.clear()
    return count
  }

  public async count(query?: QueryFilter): Promise<number> {
    if (!query) {
      return this.events.size + this.snapshots.size
    }

    let count = 0

    if (!query.kind || query.kind === 'event') {
      for (const event of Array.from(this.events.values())) {
        if (this.matchesFilter(event, query)) {
          count++
        }
      }
    }

    if (query.kind === 'snapshot') {
      for (const snapshot of Array.from(this.snapshots.values())) {
        if (this.matchesFilter(snapshot, query)) {
          count++
        }
      }
    }

    return count
  }

  public getEventsCount(): number {
    return this.events.size
  }

  public getSnapshotsCount(): number {
    return this.snapshots.size
  }

  private matchesFilter(envelope: EventEnvelope | EntitySnapshotEnvelope, query: QueryFilter): boolean {
    // Check kind
    if (query.kind && envelope.kind !== query.kind) {
      return false
    }

    // Check entityTypeName
    if (query.entityTypeName && envelope.entityTypeName !== query.entityTypeName) {
      return false
    }

    // Check entityID
    if (query.entityID && envelope.entityID !== query.entityID) {
      return false
    }

    // Check typeName
    if (query.typeName && envelope.typeName !== query.typeName) {
      return false
    }

    // Check createdAt conditions
    const envelopeCreatedAt = (envelope as EventEnvelope).createdAt
    if (query.createdAt && envelopeCreatedAt) {
      if (typeof query.createdAt === 'object') {
        const conditions = query.createdAt as CreatedAtConditions
        const envelopeTime = new Date(envelopeCreatedAt).getTime()

        if (conditions.$gt) {
          const gtTime = new Date(conditions.$gt).getTime()
          if (envelopeTime <= gtTime) return false
        }
        if (conditions.$gte) {
          const gteTime = new Date(conditions.$gte).getTime()
          if (envelopeTime < gteTime) return false
        }
        if (conditions.$lt) {
          const ltTime = new Date(conditions.$lt).getTime()
          if (envelopeTime >= ltTime) return false
        }
        if (conditions.$lte) {
          const lteTime = new Date(conditions.$lte).getTime()
          if (envelopeTime > lteTime) return false
        }
      } else if (envelopeCreatedAt !== query.createdAt) {
        return false
      }
    }

    // Check deletedAt exists condition
    if (query.deletedAt !== undefined) {
      if (typeof query.deletedAt === 'object' && '$exists' in query.deletedAt) {
        const hasDeletedAt = (envelope as EventEnvelope).deletedAt !== undefined
        if (query.deletedAt.$exists !== hasDeletedAt) return false
      }
    }

    return true
  }
}

interface CreatedAtConditions {
  $gt?: string
  $gte?: string
  $lt?: string
  $lte?: string
}

export interface QueryFilter {
  kind?: 'event' | 'snapshot'
  entityTypeName?: string
  entityID?: UUID
  typeName?: string
  createdAt?: string | CreatedAtConditions
  deletedAt?: { $exists: boolean }
}
