import {
  AnyClass,
  FieldMetadata,
  ClassMetadata,
  PropertyMetadata,
  TypeMetadata,
  ClassType,
} from '@magek/common'
import {
  FIELDS_METADATA_KEY,
  SYMBOL_METADATA,
  DecoratorMetadataObject,
} from './decorator-types'
import { CALCULATED_FIELDS_SYMBOL } from './read-model'
import { getReturnTypeMetadata } from './returns'

/**
 * Extract TypeMetadata from a @field() decorator's metadata
 */
function extractTypeMetadata(fieldMeta: FieldMetadata, isGetter: boolean = false): TypeMetadata {
  let targetType: any
  let isArray = false
  let isReadonlyArray = false

  // If typeFunction is provided, use it
  if (fieldMeta.typeFunction) {
    const result = fieldMeta.typeFunction()

    // Handle array syntax: @field(type => [String])
    if (Array.isArray(result)) {
      isArray = true
      targetType = result[0]
    } else {
      targetType = result
    }
  } else {
    // Fall back to design:type from emitDecoratorMetadata (legacy)
    targetType = fieldMeta.designType
  }

  // Determine type group and construct TypeMetadata
  return analyzeType(targetType, {
    isNullable: fieldMeta.options.nullable || false,
    isGetAccessor: isGetter,
    isArray,
    isReadonlyArray,
  })
}

interface TypeAnalysisOptions {
  isNullable: boolean
  isGetAccessor: boolean
  isArray: boolean
  isReadonlyArray: boolean
}

/**
 * Analyze a type and convert it to TypeMetadata
 */
function analyzeType(targetType: any, options: TypeAnalysisOptions): TypeMetadata {
  const { isNullable, isGetAccessor, isArray, isReadonlyArray } = options

  // Handle Array first (before primitive checks, since element type may be a primitive)
  if (isArray || isReadonlyArray) {
    const elementType = analyzeType(targetType, {
      isNullable: false,
      isGetAccessor: false,
      isArray: false,
      isReadonlyArray: false,
    })

    return {
      name: isReadonlyArray ? `readonly ${elementType.name}[]` : `${elementType.name}[]`,
      typeGroup: isReadonlyArray ? 'ReadonlyArray' : 'Array',
      typeName: isReadonlyArray ? 'ReadonlyArray' : 'Array',
      parameters: [elementType],
      isNullable,
      isGetAccessor,
    }
  }

  // Handle primitives
  if (targetType === String) {
    return {
      name: 'string',
      typeGroup: 'String',
      typeName: 'String',
      parameters: [],
      isNullable,
      isGetAccessor,
      type: String,
    }
  }

  if (targetType === Number) {
    return {
      name: 'number',
      typeGroup: 'Number',
      typeName: 'Number',
      parameters: [],
      isNullable,
      isGetAccessor,
      type: Number,
    }
  }

  if (targetType === Boolean) {
    return {
      name: 'boolean',
      typeGroup: 'Boolean',
      typeName: 'Boolean',
      parameters: [],
      isNullable,
      isGetAccessor,
      type: Boolean,
    }
  }

  // Handle Object (fallback for unknown types)
  if (targetType === Object || !targetType) {
    return {
      name: 'any',
      typeGroup: 'Other',
      typeName: 'any',
      parameters: [],
      isNullable,
      isGetAccessor,
    }
  }

  // Handle Class types
  if (typeof targetType === 'function') {
    return {
      name: targetType.name || 'Unknown',
      typeGroup: 'Class',
      typeName: targetType.name,
      parameters: [],
      isNullable,
      isGetAccessor,
      type: targetType as ClassType,
    }
  }

  // Default fallback
  return {
    name: 'unknown',
    typeGroup: 'Other',
    typeName: 'unknown',
    parameters: [],
    isNullable,
    isGetAccessor,
  }
}

/**
 * Get metadata object, preferring contextMetadata (from class decorator) over Symbol.metadata.
 * During class decorator execution, Symbol.metadata isn't yet attached to the class,
 * so we need to use context.metadata directly.
 */
function getMetadataObject(
  classType: AnyClass,
  contextMetadata?: DecoratorMetadataObject
): DecoratorMetadataObject | undefined {
  if (contextMetadata) {
    return contextMetadata
  }
  // Fall back to Symbol.metadata (for post-decorator access)
  const classRecord = classType as unknown as Record<symbol, DecoratorMetadataObject | undefined>
  return classRecord[SYMBOL_METADATA]
}

/**
 * Get all fields from a class, including inherited fields.
 * Reads from Symbol.metadata (set by TC39 Stage 3 decorators).
 *
 * @param classType - The class to get fields from
 * @param contextMetadata - Optional context.metadata from class decorator (used during decorator execution)
 */
function getAllFields(classType: AnyClass, contextMetadata?: DecoratorMetadataObject): FieldMetadata[] {
  const metadata = getMetadataObject(classType, contextMetadata)
  if (metadata?.[FIELDS_METADATA_KEY]) {
    return [...(metadata[FIELDS_METADATA_KEY] as FieldMetadata[])]
  }
  return []
}

/**
 * Get all getters (calculated fields) from a class.
 * Reads dependencies from Symbol.metadata (set by @calculatedField decorator).
 *
 * @param classType - The class to get getters from
 * @param contextMetadata - Optional context.metadata from class decorator (used during decorator execution)
 */
function getAllGetters(classType: AnyClass, contextMetadata?: DecoratorMetadataObject): PropertyMetadata[] {
  const getters: PropertyMetadata[] = []
  const prototype = classType.prototype

  // Get calculated field dependencies from metadata
  const metadata = getMetadataObject(classType, contextMetadata)
  const calculatedFields = metadata?.[CALCULATED_FIELDS_SYMBOL] as Record<string, string[]> | undefined

  // Get property descriptors
  const descriptors = Object.getOwnPropertyDescriptors(prototype)

  for (const [propertyKey, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get) {
      // This is a getter, check if it has @calculatedField metadata
      const dependencies = calculatedFields?.[propertyKey] || []

      const typeMetadata: TypeMetadata = analyzeType(Object, {
        isNullable: false,
        isGetAccessor: true,
        isArray: false,
        isReadonlyArray: false,
      })

      getters.push({
        name: propertyKey,
        typeInfo: typeMetadata,
        dependencies,
      })
    }
  }

  return getters
}

/**
 * Build ClassMetadata from @field() decorators.
 *
 * @param classType - The class to build metadata for
 * @param contextMetadata - Optional context.metadata from class decorator.
 *   IMPORTANT: During class decorator execution, Symbol.metadata isn't yet attached to the class.
 *   Class decorators must pass context.metadata to read field metadata correctly.
 */
export function buildClassMetadataFromFields(
  classType: AnyClass,
  contextMetadata?: DecoratorMetadataObject
): ClassMetadata {
  // Get all fields (including inherited)
  const fieldMetadatas = getAllFields(classType, contextMetadata)

  // Convert to PropertyMetadata
  const fields: PropertyMetadata[] = fieldMetadatas.map((fieldMeta) => ({
    name: fieldMeta.name,
    typeInfo: extractTypeMetadata(fieldMeta, false),
    dependencies: [],
  }))

  // Get getter methods (for @calculatedField)
  const methods = getAllGetters(classType, contextMetadata)

  // Check for @returns decorated handle method
  const handleReturnType = getReturnTypeMetadata(contextMetadata, 'handle')
  if (handleReturnType) {
    // Add handle method with its return type to methods array
    methods.push({
      name: 'handle',
      typeInfo: handleReturnType,
      dependencies: [],
    })
  }

  return {
    name: classType.name,
    type: classType,
    fields,
    methods,
  }
}
