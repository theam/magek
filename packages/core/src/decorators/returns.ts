import { TypeFunction, TypeMetadata, ClassType } from '@magek/common'
import { MethodDecoratorContext, DecoratorMetadataObject } from './decorator-types'

/** Symbol used to store return type metadata in decorator context.metadata */
export const RETURNS_METADATA_KEY = Symbol.for('magek:returns')

/** Metadata stored for each method's return type */
export interface ReturnsMetadata {
  methodName: string
  typeFunction: TypeFunction
}

/**
 * Analyze a type and convert it to TypeMetadata for return types.
 * This returns the GraphQL-compatible type directly (not wrapped in Promise).
 */
function analyzeReturnType(targetType: unknown): TypeMetadata {
  // Handle primitives
  if (targetType === String) {
    return {
      name: 'string',
      typeGroup: 'String',
      typeName: 'String',
      parameters: [],
      isNullable: false,
      isGetAccessor: false,
      type: String,
    }
  }

  if (targetType === Number) {
    return {
      name: 'number',
      typeGroup: 'Number',
      typeName: 'Number',
      parameters: [],
      isNullable: false,
      isGetAccessor: false,
      type: Number,
    }
  }

  if (targetType === Boolean) {
    return {
      name: 'boolean',
      typeGroup: 'Boolean',
      typeName: 'Boolean',
      parameters: [],
      isNullable: false,
      isGetAccessor: false,
      type: Boolean,
    }
  }

  // Handle void - return never to signal void return
  if (targetType === undefined || targetType === null) {
    return {
      name: 'never',
      typeGroup: 'Other',
      typeName: 'never',
      parameters: [],
      isNullable: false,
      isGetAccessor: false,
    }
  }

  // Handle Array
  if (Array.isArray(targetType)) {
    if (targetType.length === 0) {
      throw new Error('@returns decorator array type must specify an element type, e.g., @returns(type => [String])')
    }
    const elementType = targetType[0]
    const elementMetadata = analyzeReturnType(elementType)
    return {
      name: `${elementMetadata.name}[]`,
      typeGroup: 'Array',
      typeName: 'Array',
      parameters: [elementMetadata],
      isNullable: false,
      isGetAccessor: false,
    }
  }

  // Handle Class types (e.g., UUID, custom types)
  if (typeof targetType === 'function') {
    return {
      name: (targetType as Function).name || 'Unknown',
      typeGroup: 'Class',
      typeName: (targetType as Function).name,
      parameters: [],
      isNullable: false,
      isGetAccessor: false,
      type: targetType as ClassType,
    }
  }

  // Default fallback
  return {
    name: 'unknown',
    typeGroup: 'Other',
    typeName: 'unknown',
    parameters: [],
    isNullable: false,
    isGetAccessor: false,
  }
}

/**
 * Get the return type metadata for a method from decorator metadata.
 *
 * @param contextMetadata - The context.metadata from a class decorator
 * @param methodName - The name of the method to get return type for
 */
export function getReturnTypeMetadata(
  contextMetadata: DecoratorMetadataObject | undefined,
  methodName: string
): TypeMetadata | undefined {
  if (!contextMetadata) {
    return undefined
  }

  const returnsMetadataList = contextMetadata[RETURNS_METADATA_KEY] as ReturnsMetadata[] | undefined
  if (!returnsMetadataList) {
    return undefined
  }

  const metadata = returnsMetadataList.find((m) => m.methodName === methodName)
  if (!metadata) {
    return undefined
  }

  // Evaluate the type function and analyze the result
  const typeResult = metadata.typeFunction()
  // Return the actual type (not wrapped in Promise) - this is the GraphQL return type
  return analyzeReturnType(typeResult)
}

/**
 * @returns() decorator for explicit return type declaration on methods.
 *
 * Uses TC39 Stage 3 decorators to capture return type metadata that is used
 * for GraphQL schema generation. The type specified should be the GraphQL
 * return type (not wrapped in Promise).
 *
 * Usage:
 *   @returns(type => UUID)
 *   public static async handle(...): Promise<UUID> { ... }
 *
 *   @returns(type => String)
 *   public static async handle(...): Promise<string> { ... }
 *
 *   @returns(type => [CartItem])
 *   public static async handle(...): Promise<CartItem[]> { ... }
 */
export function returns(typeFunction: TypeFunction): MethodDecorator {
  return function returnsDecorator(
    _target: unknown,
    context: MethodDecoratorContext
  ): void {
    const methodName = context.name.toString()

    // Store in context.metadata for later retrieval by class decorators
    if (context.metadata) {
      if (!context.metadata[RETURNS_METADATA_KEY]) {
        context.metadata[RETURNS_METADATA_KEY] = []
      }
      const returnsList = context.metadata[RETURNS_METADATA_KEY] as ReturnsMetadata[]
      // Remove any existing entry for this method (in case of decorator re-application)
      const filteredList = returnsList.filter((m) => m.methodName !== methodName)
      filteredList.push({
        methodName,
        typeFunction,
      })
      context.metadata[RETURNS_METADATA_KEY] = filteredList
    }
  } as MethodDecorator
}

/** Type for the returns decorator */
type MethodDecorator = (
  target: unknown,
  context: MethodDecoratorContext
) => void
