import 'reflect-metadata'

export type ClassType = { new (...args: unknown[]): unknown }

/**
 * Type function for specifying field types
 * The parameter is optional and not used - it's just for TypeGraphQL-style ergonomics
 */
export type TypeFunction = (type?: unknown) => unknown

/**
 * Options for the @field() decorator
 */
export interface FieldOptions {
  nullable?: boolean
  readonly?: boolean
}

/**
 * Metadata stored for each field
 */
export interface FieldMetadata {
  name: string
  typeFunction?: TypeFunction
  options: FieldOptions
  designType?: unknown // From emitDecoratorMetadata (not used in Stage 3)
}

// type instead of enum to be able to install this package as a devDependency and not a production dependency
export type TypeGroup =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Enum'
  | 'Union'
  | 'Intersection'
  | 'Function'
  | 'Class'
  | 'Interface'
  | 'Type'
  | 'Array'
  | 'Object'
  | 'ReadonlyArray'
  | 'Other'

export interface TypeMetadata {
  name: string
  typeGroup: TypeGroup
  parameters: Array<TypeMetadata>
  isNullable: boolean
  isGetAccessor: boolean
  typeName?: string
  importPath?: string
  type?: ClassType
}

export interface PropertyMetadata {
  name: string
  typeInfo: TypeMetadata
  dependencies: Array<string>
}

export interface ClassMetadata {
  name: string
  type: ClassType
  fields: Array<PropertyMetadata>
  methods: Array<PropertyMetadata>
}

// Metadata helper functions
export function defineMetadata(metadataKey: string | symbol, metadataValue: unknown, target: object): void {
  Reflect.defineMetadata(metadataKey, metadataValue, target)
}

export function getMetadata<T>(metadataKey: string | symbol, target: object): T | undefined {
  return Reflect.getMetadata(metadataKey, target) as T | undefined
}
