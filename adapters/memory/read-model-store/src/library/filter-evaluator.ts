/* eslint-disable @typescript-eslint/no-explicit-any */

export type FilterValue = number | string | boolean | null | undefined

export interface EvaluatedFilter {
  [key: string]: FilterOperation
}

export type FilterOperation =
  | FilterValue
  | { $eq?: FilterValue }
  | { $ne?: FilterValue }
  | { $lt?: FilterValue }
  | { $gt?: FilterValue }
  | { $lte?: FilterValue }
  | { $gte?: FilterValue }
  | { $in?: FilterValue[] }
  | { $exists?: boolean }
  | { $regex?: RegExp }
  | { $elemMatch?: FilterValue }
  | { $and?: EvaluatedFilter[] }
  | { $or?: EvaluatedFilter[] }
  | { $not?: EvaluatedFilter }

/**
 * Evaluates a filter against a value object.
 * Returns true if the value matches the filter conditions.
 */
export function evaluateFilter(value: Record<string, any>, filters: any): boolean {
  if (!filters || Object.keys(filters).length === 0) {
    return true
  }

  for (const key in filters) {
    const filterValue = filters[key]

    // Handle logical operators
    if (key === 'and') {
      const andFilters = filterValue as any[]
      if (!andFilters.every((f) => evaluateFilter(value, f))) {
        return false
      }
      continue
    }

    if (key === 'or') {
      const orFilters = filterValue as any[]
      if (!orFilters.some((f) => evaluateFilter(value, f))) {
        return false
      }
      continue
    }

    if (key === 'not') {
      if (evaluateFilter(value, filterValue)) {
        return false
      }
      continue
    }

    // Handle field-level filters
    const fieldValue = getNestedValue(value, key)
    if (!evaluateFieldFilter(fieldValue, filterValue)) {
      return false
    }
  }

  return true
}

/**
 * Gets a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.')
  let current: any = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[part]
  }

  return current
}

/**
 * Evaluates a filter against a single field value.
 */
function evaluateFieldFilter(fieldValue: any, filter: any): boolean {
  if (filter === null || filter === undefined) {
    return true
  }

  // If filter is a primitive, it's an implicit eq operation
  if (typeof filter !== 'object') {
    return fieldValue === filter
  }

  // Check for filter operations
  const filterKeys = Object.keys(filter)

  for (const op of filterKeys) {
    const opValue = filter[op]

    switch (op) {
      case 'eq':
        if (fieldValue !== opValue) return false
        break

      case 'ne':
        if (fieldValue === opValue) return false
        break

      case 'lt':
        if (fieldValue >= opValue) return false
        break

      case 'gt':
        if (fieldValue <= opValue) return false
        break

      case 'lte':
        if (fieldValue > opValue) return false
        break

      case 'gte':
        if (fieldValue < opValue) return false
        break

      case 'in':
        if (!Array.isArray(opValue) || !opValue.includes(fieldValue)) return false
        break

      case 'isDefined': {
        const exists = fieldValue !== undefined && fieldValue !== null
        if (opValue !== exists) return false
        break
      }

      case 'contains':
        if (typeof fieldValue !== 'string' || !fieldValue.includes(opValue as string)) return false
        break

      case 'beginsWith':
        if (typeof fieldValue !== 'string' || !fieldValue.startsWith(opValue as string)) return false
        break

      case 'regex':
        if (typeof fieldValue !== 'string') return false
        try {
          const regex = new RegExp(opValue as string)
          if (!regex.test(fieldValue)) return false
        } catch {
          return false
        }
        break

      case 'iRegex':
        if (typeof fieldValue !== 'string') return false
        try {
          const regex = new RegExp(opValue as string, 'i')
          if (!regex.test(fieldValue)) return false
        } catch {
          return false
        }
        break

      case 'includes':
        if (!Array.isArray(fieldValue)) return false
        if (typeof opValue === 'string') {
          // Check if any element contains the string
          if (!fieldValue.some((item) => typeof item === 'string' && item.includes(opValue))) return false
        } else {
          // Check if array includes the value (elemMatch-like)
          if (!fieldValue.some((item) => {
            if (typeof opValue === 'object' && opValue !== null) {
              return evaluateFilter(item as Record<string, any>, opValue)
            }
            return item === opValue
          })) return false
        }
        break

      default:
        // If the key is not a known operator, it might be a nested filter
        if (!evaluateFieldFilter(getNestedValue(fieldValue, op), filter[op])) {
          return false
        }
    }
  }

  return true
}

/**
 * Converts a GraphQL filter to an evaluated filter structure.
 * This function transforms Magek-style filters into a format that can be
 * efficiently evaluated against data.
 */
export function convertFilter(filters: any, prefix = ''): EvaluatedFilter {
  const result: EvaluatedFilter = {}

  for (const key in filters) {
    const filterValue = filters[key]
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (key === 'and' || key === 'or') {
      const logicalFilters = (filterValue as any[]).map((f) => convertFilter(f))
      result[`$${key}`] = logicalFilters as any
    } else if (key === 'not') {
      result['$not'] = convertFilter(filterValue) as any
    } else if (typeof filterValue === 'object' && filterValue !== null) {
      // Check if this is a filter operation object
      const opKeys = Object.keys(filterValue)
      const isFilterOp = opKeys.some((k) =>
        ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'isDefined', 'contains', 'beginsWith', 'regex', 'iRegex', 'includes'].includes(k)
      )

      if (isFilterOp) {
        result[fullKey] = convertFilterOperation(filterValue)
      } else {
        // Nested object filter
        Object.assign(result, convertFilter(filterValue, fullKey))
      }
    } else {
      result[fullKey] = filterValue as FilterOperation
    }
  }

  return result
}

function convertFilterOperation(filter: any): FilterOperation {
  const op = Object.keys(filter)[0]
  const value = filter[op]

  switch (op) {
    case 'eq':
      return { $eq: value }
    case 'ne':
      return { $ne: value }
    case 'lt':
      return { $lt: value }
    case 'gt':
      return { $gt: value }
    case 'lte':
      return { $lte: value }
    case 'gte':
      return { $gte: value }
    case 'in':
      return { $in: value }
    case 'isDefined':
      return { $exists: value }
    case 'contains':
    case 'beginsWith':
    case 'regex':
      return { $regex: new RegExp(op === 'beginsWith' ? `^${value}` : value) }
    case 'iRegex':
      return { $regex: new RegExp(value, 'i') }
    case 'includes':
      if (typeof value === 'string') {
        return { $regex: new RegExp(value) }
      }
      return { $elemMatch: value }
    default:
      return value
  }
}
