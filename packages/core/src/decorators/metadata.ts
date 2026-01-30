import { AnyClass, ClassMetadata, getMetadata } from '@magek/common'
import { buildClassMetadataFromFields } from './field-metadata-reader'
import { DecoratorMetadataObject, SYMBOL_METADATA } from './decorator-types'
import { NON_EXPOSED_SYMBOL } from './non-exposed'

/**
 * Get non-exposed fields from decorator metadata.
 *
 * @param metadata - The context.metadata object from a class decorator
 * @returns Array of field names marked with @nonExposed
 */
export function getNonExposedFields(metadata?: DecoratorMetadataObject): string[] {
  return (metadata?.[NON_EXPOSED_SYMBOL] as string[]) || []
}

/**
 * Get class metadata from @field() decorators or legacy transformer metadata.
 *
 * @param classType - The class to get metadata for
 * @param contextMetadata - Optional context.metadata from class decorator.
 *   IMPORTANT: During class decorator execution, Symbol.metadata isn't yet attached to the class.
 *   Class decorators must pass context.metadata to read field metadata correctly.
 */
export function getClassMetadata(
  classType: AnyClass,
  contextMetadata?: DecoratorMetadataObject
): ClassMetadata {
  // Check if new decorator system is being used
  const classRecord = classType as unknown as Record<symbol, DecoratorMetadataObject | undefined>
  const hasNewDecoratorSystem = contextMetadata !== undefined || classRecord[SYMBOL_METADATA] !== undefined

  // Try new @field() decorator system first
  try {
    const fieldMetadata = buildClassMetadataFromFields(classType, contextMetadata)
    // If new decorator system is detected, always return the metadata (even if empty)
    // This allows commands with no fields to work without @field() decorators
    if (hasNewDecoratorSystem) {
      return fieldMetadata
    }
    // For legacy system compatibility, only return if fields/methods exist
    if (fieldMetadata.fields.length > 0 || fieldMetadata.methods.length > 0) {
      return fieldMetadata
    }
  } catch (error) {
    // If field metadata reading fails and we're using new decorators, re-throw
    if (hasNewDecoratorSystem) {
      throw error
    }
    // Otherwise, try old system
  }

  // Fall back to old transformer-based system
  const meta = getMetadata<ClassMetadata>('magek:typeinfo', classType as object)
  if (!meta) {
    throw Error(
      `Couldn't get proper metadata information of ${classType.name}. ` +
        'Make sure to decorate all properties with @field() or enable the TypeScript transformer.'
    )
  }
  return meta
}

/**
 * Get the argument names from a given function.
 *
 * This implementation is a TypeScript adaptation of a JavaScript implementation
 * borrowed from the promisify-node code and can be found in the following link:
 * https://github.com/nodegit/promisify-node/blob/02fc47cfc00146a533193bc4740e2e3e3be81c6f/utils/args.js
 *
 * @param {Function} func - The function to parse.
 * @returns {Array} arg - List of arguments in the function.
 */
// TODO: Consider extending `@magek/metadata` to yield constructor argument types
 
export function getFunctionArguments(func: Function): Array<string> {
  // First match everything inside the function argument parens.
  const args = func.toString().match(/([^(])*\(([^)]*)\)/)?.[2]

  if (!args) return []

  // Split the arguments string into an array comma delimited.
  return args
    .split(', ')
    .map(function (arg) {
      // Ensure no inline comments are parsed and trim the whitespace.
      return arg.replace(/\/\*.*\*\//, '').trim()
    })
    .filter(function (arg) {
      // Ensure no undefineds are added.
      return arg
    })
}
