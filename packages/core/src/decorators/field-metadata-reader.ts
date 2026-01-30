import {
  AnyClass,
  FieldMetadata,
  ClassMetadata,
  PropertyMetadata,
  TypeMetadata,
  ClassType,
  getMetadata,
} from '@magek/common'
import {
  FIELDS_METADATA_KEY,
  SYMBOL_METADATA,
  DecoratorMetadataObject,
  getFieldMetadata,
} from './decorator-types'

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
 * Get all fields from a class, including inherited fields
 */
function getAllFields(classType: AnyClass): FieldMetadata[] {
  const fields: FieldMetadata[] = []
  const seenNames = new Set<string>()

  const addField = (field: FieldMetadata) => {
    if (!seenNames.has(field.name)) {
      seenNames.add(field.name)
      fields.push(field)
    }
  }

  // Check Symbol.metadata (TypeScript sets this for Stage 3 decorators)
  const classRecord = classType as unknown as Record<symbol, DecoratorMetadataObject | undefined>
  const metadata = classRecord[SYMBOL_METADATA]
  if (metadata?.[FIELDS_METADATA_KEY]) {
    ;(metadata[FIELDS_METADATA_KEY] as FieldMetadata[]).forEach(addField)
  }

  // Check WeakMap storage (primary mechanism)
  getFieldMetadata(classType).forEach(addField)

  // Walk prototype chain for inherited fields
  let proto = Object.getPrototypeOf(classType)
  while (proto && proto !== Function.prototype) {
    getFieldMetadata(proto).forEach(addField)
    proto = Object.getPrototypeOf(proto)
  }

  return fields
}

/**
 * Get all getters (calculated fields) from a class
 */
function getAllGetters(classType: AnyClass): PropertyMetadata[] {
  const getters: PropertyMetadata[] = []
  const prototype = classType.prototype

  // Get property descriptors
  const descriptors = Object.getOwnPropertyDescriptors(prototype)

  for (const [propertyKey, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get) {
      // This is a getter, check if it has @calculatedField metadata
      const dependencies: string[] =
        getMetadata<Record<string, string[]>>('dynamic:dependencies', classType)?.[propertyKey] || []

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
 * Build ClassMetadata from @field() decorators
 */
export function buildClassMetadataFromFields(classType: AnyClass): ClassMetadata {
  // Get all fields (including inherited)
  const fieldMetadatas = getAllFields(classType)

  // Convert to PropertyMetadata
  const fields: PropertyMetadata[] = fieldMetadatas.map((fieldMeta) => ({
    name: fieldMeta.name,
    typeInfo: extractTypeMetadata(fieldMeta, false),
    dependencies: [],
  }))

  // Get getter methods (for @calculatedField)
  const methods = getAllGetters(classType)

  return {
    name: classType.name,
    type: classType,
    fields,
    methods,
  }
}
