import 'reflect-metadata'

/**
 * Type function for specifying field types
 * The parameter is optional and not used - it's just for TypeGraphQL-style ergonomics
 */
export type TypeFunction = (type?: unknown) => unknown

/**
 * Options for the @Field() decorator
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
  designType?: unknown // From emitDecoratorMetadata
}

// Symbol for storing fields metadata (for Stage 3 decorators)
const FIELDS_KEY = Symbol.for('magek:fields')

/**
 * Stage 3 decorator context for class fields (TypeScript 5.0+)
 * This is a simplified version compatible with ClassFieldDecoratorContext
 */
interface Stage3FieldContext {
  kind: 'field'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  access?: unknown // Simplified to avoid variance issues
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 decorator context
 */
function isStage3Context(arg: unknown): arg is Stage3FieldContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3FieldContext).kind === 'field' &&
    'name' in arg
  )
}

/**
 * Store field metadata on a constructor (works for both legacy and Stage 3)
 */
function storeFieldMetadata(constructor: Function, fieldMetadata: FieldMetadata): void {
  // Get existing fields
  let existingFields: FieldMetadata[] = []

  // Try Reflect.getMetadata first
  try {
    if (typeof Reflect !== 'undefined' && typeof Reflect.getMetadata === 'function') {
      existingFields = Reflect.getMetadata('magek:fields', constructor) || []
    }
  } catch {
    // Ignore
  }

  // Also check fallback property
  const ctorWithFields = constructor as { __magek_fields__?: FieldMetadata[] }
  if (existingFields.length === 0 && ctorWithFields.__magek_fields__) {
    existingFields = ctorWithFields.__magek_fields__
  }

  // Add this field (avoid duplicates by name)
  const filteredFields = existingFields.filter((f) => f.name !== fieldMetadata.name)
  filteredFields.push(fieldMetadata)

  // Store using both mechanisms for reliability
  try {
    if (typeof Reflect !== 'undefined' && typeof Reflect.defineMetadata === 'function') {
      Reflect.defineMetadata('magek:fields', filteredFields, constructor)
    }
  } catch {
    // Ignore
  }

  // Also store as a fallback property
  ctorWithFields.__magek_fields__ = filteredFields
}

/**
 * Handle legacy decorator format (experimentalDecorators)
 */
function handleLegacyDecorator(
  target: object,
  propertyKey: string | symbol,
  typeFunction: TypeFunction | undefined,
  fieldOptions: FieldOptions
): void {
  // Get design type from TypeScript decorator metadata
  let designType: unknown
  try {
    if (typeof Reflect !== 'undefined' && typeof Reflect.getMetadata === 'function') {
      designType = Reflect.getMetadata('design:type', target, propertyKey)
    }
  } catch {
    // Ignore - Reflect.getMetadata may fail if called before initialization
  }

  const fieldMetadata: FieldMetadata = {
    name: propertyKey.toString(),
    typeFunction,
    options: fieldOptions,
    designType,
  }

  const constructor = target.constructor
  if (constructor) {
    storeFieldMetadata(constructor, fieldMetadata)
  }
}

/**
 * Handle Stage 3 decorator format (TC39 decorators)
 */
function handleStage3Decorator(
  context: Stage3FieldContext,
  typeFunction: TypeFunction | undefined,
  fieldOptions: FieldOptions
): void {
  const fieldMetadata: FieldMetadata = {
    name: context.name.toString(),
    typeFunction,
    options: fieldOptions,
    designType: undefined, // Stage 3 doesn't have design:type
  }

  // Store in context.metadata for later retrieval by class decorators
  // Class decorators (like @Command, @Entity, etc.) will transfer this to the class constructor
  if (context.metadata) {
    if (!context.metadata[FIELDS_KEY]) {
      context.metadata[FIELDS_KEY] = []
    }
    const fields = context.metadata[FIELDS_KEY] as FieldMetadata[]
    const filteredFields = fields.filter((f) => f.name !== fieldMetadata.name)
    filteredFields.push(fieldMetadata)
    context.metadata[FIELDS_KEY] = filteredFields
  }
}

/**
 * Decorator return type that supports both legacy and Stage 3 formats.
 * This is a function that can be called with either signature.
 */
type UniversalFieldDecorator = {
  // Legacy signature
  (target: object, propertyKey: string | symbol): void
  // Stage 3 signature
  (value: undefined, context: Stage3FieldContext): void
}

/**
 * @Field() decorator for explicit type declaration
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * Usage:
 *   @Field() - Simple type (inferred from design:type in legacy mode)
 *   @Field(type => String) - Explicit type
 *   @Field(type => [String]) - Array type
 *   @Field({ nullable: true }) - With options
 *   @Field(type => String, { nullable: true }) - Type with options
 */
export function Field(): UniversalFieldDecorator
export function Field(options: FieldOptions): UniversalFieldDecorator
export function Field(typeFunction: TypeFunction): UniversalFieldDecorator
export function Field(typeFunction: TypeFunction, options: FieldOptions): UniversalFieldDecorator
export function Field(
  typeFunctionOrOptions?: TypeFunction | FieldOptions,
  options?: FieldOptions
): UniversalFieldDecorator {
  // Parse arguments
  let typeFunction: TypeFunction | undefined
  let fieldOptions: FieldOptions = {}

  if (typeof typeFunctionOrOptions === 'function') {
    typeFunction = typeFunctionOrOptions
    fieldOptions = options || {}
  } else if (typeFunctionOrOptions) {
    fieldOptions = typeFunctionOrOptions
  }

  // Return decorator that handles both formats
  return function fieldDecorator(
    targetOrValue: object | undefined,
    propertyKeyOrContext: string | symbol | Stage3FieldContext
  ): void {
    // Detect Stage 3 vs Legacy based on the second argument
    if (isStage3Context(propertyKeyOrContext)) {
      // Stage 3 decorator
      handleStage3Decorator(propertyKeyOrContext, typeFunction, fieldOptions)
    } else if (targetOrValue) {
      // Legacy decorator
      handleLegacyDecorator(
        targetOrValue,
        propertyKeyOrContext as string | symbol,
        typeFunction,
        fieldOptions
      )
    }
    // If targetOrValue is undefined and not Stage 3, silently skip
  } as UniversalFieldDecorator
}
