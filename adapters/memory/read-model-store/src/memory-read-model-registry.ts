import {
  ReadModelEnvelope,
  SortFor,
  ProjectionFor,
  UUID,
  OptimisticConcurrencyUnexpectedVersionError,
} from '@magek/common'
import { evaluateFilter } from './library/filter-evaluator'

export interface ReadModelStoreEntry extends ReadModelEnvelope {
  uniqueKey: string
}

interface LocalSortedFor {
  [key: string]: number
}

export class MemoryReadModelRegistry {
  private readModels: Map<string, ReadModelStoreEntry> = new Map()
  private byType: Map<string, Set<string>> = new Map()

  private getKey(typeName: string, id: UUID): string {
    return `${typeName}:${id}`
  }

  public async query(
    query: QueryFilter,
    sortBy?: SortFor<unknown>,
    skip?: number,
    limit?: number,
    select?: ProjectionFor<unknown>
  ): Promise<Array<ReadModelEnvelope>> {
    let results: ReadModelEnvelope[] = []

    // Filter by typeName first if provided
    if (query.typeName) {
      const typeKeys = this.byType.get(query.typeName)
      if (typeKeys) {
        for (const key of Array.from(typeKeys)) {
          const entry = this.readModels.get(key)
          if (entry && this.matchesFilter(entry, query)) {
            results.push(entry)
          }
        }
      }
    } else {
      // Query all read models
      for (const entry of Array.from(this.readModels.values())) {
        if (this.matchesFilter(entry, query)) {
          results.push(entry)
        }
      }
    }

    // Apply sorting
    if (sortBy && Object.keys(sortBy).length > 0) {
      const sortedList = this.toLocalSortFor(sortBy)
      if (sortedList) {
        results = this.sortResults(results, sortedList)
      }
    }

    // Apply skip
    if (skip && skip > 0) {
      results = results.slice(skip)
    }

    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(0, limit)
    }

    // Apply select (field projection)
    if (select && select.length > 0) {
      results = results.map((result) => ({
        ...result,
        value: this.filterFields(result.value, select),
      }))
    }

    return results
  }

  public async store(readModel: ReadModelEnvelope, expectedCurrentVersion: number): Promise<void> {
    const key = this.getKey(readModel.typeName, readModel.value.id)
    const version = readModel.value.magekMetadata?.version ?? 1
    const uniqueKey = `${readModel.typeName}_${readModel.value.id}_${version}`

    const entry: ReadModelStoreEntry = {
      ...readModel,
      uniqueKey,
    }

    if (version === 1) {
      // Insert new read model
      this.readModels.set(key, entry)

      // Index by type
      if (!this.byType.has(readModel.typeName)) {
        this.byType.set(readModel.typeName, new Set())
      }
      this.byType.get(readModel.typeName)!.add(key)
    } else {
      // Update existing read model with optimistic concurrency check
      const existing = this.readModels.get(key)

      if (!existing) {
        throw new OptimisticConcurrencyUnexpectedVersionError(
          `Can't update readModel ${JSON.stringify(readModel)} with expectedCurrentVersion = ${expectedCurrentVersion}. Read model not found.`
        )
      }

      const existingVersion = existing.value.magekMetadata?.version ?? 0

      if (existingVersion !== expectedCurrentVersion) {
        throw new OptimisticConcurrencyUnexpectedVersionError(
          `Can't update readModel ${JSON.stringify(readModel)} with expectedCurrentVersion = ${expectedCurrentVersion}. Current version is ${existingVersion}.`
        )
      }

      this.readModels.set(key, entry)
    }
  }

  public async deleteById(id: UUID, typeName: string): Promise<number> {
    const key = this.getKey(typeName, id)
    const exists = this.readModels.has(key)

    if (exists) {
      this.readModels.delete(key)
      this.byType.get(typeName)?.delete(key)
      return 1
    }

    return 0
  }

  public async deleteAll(): Promise<number> {
    const count = this.readModels.size
    this.readModels.clear()
    this.byType.clear()
    return count
  }

  public async count(query?: QueryFilter): Promise<number> {
    if (!query) {
      return this.readModels.size
    }

    let count = 0
    for (const entry of Array.from(this.readModels.values())) {
      if (this.matchesFilter(entry, query)) {
        count++
      }
    }

    return count
  }

  public getCount(): number {
    return this.readModels.size
  }

  private matchesFilter(entry: ReadModelEnvelope, query: QueryFilter): boolean {
    // Check typeName
    if (query.typeName && entry.typeName !== query.typeName) {
      return false
    }

    // Check value.id
    if (query['value.id'] && entry.value.id !== query['value.id']) {
      return false
    }

    // Check sequence key if present
    for (const key of Object.keys(query)) {
      if (key.startsWith('value.') && key !== 'value.id') {
        const fieldPath = key.substring(6) // Remove 'value.' prefix
        const fieldValue = this.getNestedValue(entry.value, fieldPath)
        if (fieldValue !== query[key]) {
          return false
        }
      }
    }

    // Check GraphQL-style filters
    if (query.filters) {
      if (!evaluateFilter(entry.value, query.filters)) {
        return false
      }
    }

    return true
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    const parts = path.split('.')
    let current = obj

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = current[part]
    }

    return current
  }

  private toLocalSortFor(
    sortBy?: SortFor<unknown>,
    parentKey = '',
    sortedList: LocalSortedFor = Object.create(null)
  ): undefined | LocalSortedFor {
    if (!sortBy || Object.keys(sortBy).length === 0) return undefined

    Object.entries(sortBy).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sortedList[`value.${parentKey}${key}`] = (value as string) === 'ASC' ? 1 : -1
      } else {
        this.toLocalSortFor(value as SortFor<unknown>, `${parentKey}${key}.`, sortedList)
      }
    })

    return sortedList
  }

  private sortResults(results: ReadModelEnvelope[], sortedList: LocalSortedFor): ReadModelEnvelope[] {
    return [...results].sort((a, b) => {
      for (const [path, direction] of Object.entries(sortedList)) {
        const aValue = this.getNestedValue(a, path)
        const bValue = this.getNestedValue(b, path)

        if (aValue < bValue) return -1 * direction
        if (aValue > bValue) return 1 * direction
      }
      return 0
    })
  }

  private filterFields(obj: any, select: string[]): any {
    const result: any = Object.create(null)

    select.forEach((field) => {
      const parts = field.split('.')
      this.setNestedValue(result, obj, parts)
    })

    return result
  }

  private setNestedValue(result: any, source: any, parts: string[]): void {
    let currentResult = result
    let currentSource = source

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (part.endsWith('[]')) {
        const arrayField = part.slice(0, -2)
        if (!Array.isArray(currentSource[arrayField])) {
          return
        }
        if (!currentResult[arrayField]) {
          currentResult[arrayField] = []
        }
        if (isLast) {
          currentResult[arrayField] = currentSource[arrayField]
        } else {
          currentSource[arrayField].forEach((item: any, index: number) => {
            if (!currentResult[arrayField][index]) {
              currentResult[arrayField][index] = Object.create(null)
            }
            this.setNestedValue(currentResult[arrayField][index], item, parts.slice(i + 1))
          })
        }
      } else {
        if (isLast) {
          if (currentSource[part] !== undefined) {
            currentResult[part] = currentSource[part]
          }
        } else {
          if (!currentSource[part]) {
            return
          }
          if (!currentResult[part]) {
            currentResult[part] = Array.isArray(currentSource[part]) ? [] : Object.create(null)
          }
          currentResult = currentResult[part]
          currentSource = currentSource[part]
        }
      }
    }
  }
}

export interface QueryFilter {
  typeName?: string
  'value.id'?: UUID
  filters?: any
  [key: string]: any
}
