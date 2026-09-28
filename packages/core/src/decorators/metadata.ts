import { AnyClass, ClassMetadata, MagekConfig } from '@magek/common'
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
 * Fields that must be left out of GraphQL for a class.
 * Class decorators register the list under the class name. A nested class with no
 * class decorator only has the names on its own decorator metadata.
 */
export function nonExposedFieldsForClass(config: MagekConfig, type: AnyClass): string[] {
  const registered = config.nonExposedGraphQLMetadataKey[type.name]
  if (registered) {
    return registered
  }
  const classRecord = type as unknown as Record<symbol, DecoratorMetadataObject | undefined>
  return getNonExposedFields(classRecord[SYMBOL_METADATA])
}

/**
 * Get class metadata from @field() decorators.
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
  return buildClassMetadataFromFields(classType, contextMetadata)
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
