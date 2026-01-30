import { FieldMetadata, FieldOptions, TypeFunction } from '@magek/common'
import { FIELDS_METADATA_KEY, FieldDecoratorContext } from './decorator-types'

/**
 * Handle Stage 3 decorator format (TC39 decorators)
 */
function handleStage3Decorator(
  context: FieldDecoratorContext,
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
    if (!context.metadata[FIELDS_METADATA_KEY]) {
      context.metadata[FIELDS_METADATA_KEY] = []
    }
    const fields = context.metadata[FIELDS_METADATA_KEY] as FieldMetadata[]
    const filteredFields = fields.filter((f) => f.name !== fieldMetadata.name)
    filteredFields.push(fieldMetadata)
    context.metadata[FIELDS_METADATA_KEY] = filteredFields
  }
}

/**
 * Stage 3 field decorator type
 */
type Stage3FieldDecorator = (value: undefined, context: FieldDecoratorContext) => void

/**
 * @field() decorator for explicit type declaration
 *
 * Uses TC39 Stage 3 decorators.
 *
 * Usage:
 *   @field() - Simple type
 *   @field(type => String) - Explicit type
 *   @field(type => [String]) - Array type
 *   @field({ nullable: true }) - With options
 *   @field(type => String, { nullable: true }) - Type with options
 */
export function field(): Stage3FieldDecorator
export function field(options: FieldOptions): Stage3FieldDecorator
export function field(typeFunction: TypeFunction): Stage3FieldDecorator
export function field(typeFunction: TypeFunction, options: FieldOptions): Stage3FieldDecorator
export function field(
  typeFunctionOrOptions?: TypeFunction | FieldOptions,
  options?: FieldOptions
): Stage3FieldDecorator {
  // Parse arguments
  let typeFunction: TypeFunction | undefined
  let fieldOptions: FieldOptions = {}

  if (typeof typeFunctionOrOptions === 'function') {
    typeFunction = typeFunctionOrOptions
    fieldOptions = options || {}
  } else if (typeFunctionOrOptions) {
    fieldOptions = typeFunctionOrOptions
  }

  // Return Stage 3 decorator
  return function fieldDecorator(_value: undefined, context: FieldDecoratorContext): void {
    handleStage3Decorator(context, typeFunction, fieldOptions)
  }
}

// Re-export with PascalCase alias for backward compatibility during migration
// TODO: Remove this alias after all usages have been updated to @field
export { field as Field }
