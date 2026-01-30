import { FieldMetadata } from '@magek/common'

// ============ SYMBOLS ============

/** Symbol used to store field metadata in decorator context.metadata */
export const FIELDS_METADATA_KEY = Symbol.for('magek:fields')

/**
 * Symbol.metadata - either the native one or TypeScript's polyfill.
 * TypeScript uses Symbol.for('Symbol.metadata') when native isn't available.
 */
export const SYMBOL_METADATA: symbol =
  (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata')

// ============ DECORATOR CONTEXT TYPES ============

export type DecoratorMetadataObject = Record<string | symbol, unknown>

export interface ClassDecoratorContext {
  kind: 'class'
  name: string | undefined
  metadata?: DecoratorMetadataObject
  addInitializer?: (initializer: () => void) => void
}

export interface FieldDecoratorContext {
  kind: 'field'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: DecoratorMetadataObject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  access?: { get?: (object: any) => any; set?: (object: any, value: any) => void }
  addInitializer?: (initializer: () => void) => void
}

export interface MethodDecoratorContext {
  kind: 'method'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: DecoratorMetadataObject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  access?: { get?: (object: any) => any; has?: (object: any) => boolean }
  addInitializer?: (initializer: () => void) => void
}

export interface GetterDecoratorContext {
  kind: 'getter'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: DecoratorMetadataObject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  access?: { get?: (object: any) => any; has?: (object: any) => boolean }
  addInitializer?: (initializer: () => void) => void
}

// ============ FIELD METADATA STORAGE ============

const fieldMetadataStore = new WeakMap<Function, FieldMetadata[]>()

export function getFieldMetadata(classType: Function): FieldMetadata[] {
  return fieldMetadataStore.get(classType) ?? []
}

export function setFieldMetadata(classType: Function, fields: FieldMetadata[]): void {
  fieldMetadataStore.set(classType, fields)
}

export function addFieldMetadata(classType: Function, field: FieldMetadata): void {
  const existing = getFieldMetadata(classType)
  const filtered = existing.filter((f) => f.name !== field.name)
  filtered.push(field)
  setFieldMetadata(classType, filtered)
}
