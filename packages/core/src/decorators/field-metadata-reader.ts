import { AnyClass, FieldMetadata, ClassMetadata, PropertyMetadata, TypeMetadata, ClassType, getMetadata } from '@magek/common'

// Symbol used by Stage 3 decorators to store field metadata
const FIELDS_KEY = Symbol.for('magek:fields')

// Symbol.metadata may not be defined in all TypeScript lib versions
// Use a well-known symbol that Stage 3 decorators use
const METADATA_KEY: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata')

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

  // First, check for Stage 3 decorator metadata (Symbol.metadata on the class)
  // Stage 3 decorators store metadata in classType[Symbol.metadata]
  const classAsRecord = classType as unknown as Record<symbol, Record<symbol, unknown> | undefined>
  const metadata = classAsRecord[METADATA_KEY]
  if (metadata && metadata[FIELDS_KEY]) {
    const stage3Fields = metadata[FIELDS_KEY] as FieldMetadata[]
    for (const field of stage3Fields) {
      if (!fields.some((f) => f.name === field.name)) {
        fields.push(field)
      }
    }
  }

  // Then walk up the prototype chain for __magek_fields__ fallback
  let currentPrototype = classType.prototype

  while (currentPrototype && currentPrototype !== Object.prototype) {
    const constructor = currentPrototype.constructor as { __magek_fields__?: FieldMetadata[] }

    // Check fallback property
    if (constructor.__magek_fields__) {
      const prototypeFields = constructor.__magek_fields__
      // Add fields that aren't already in the list (child overrides parent)
      for (const field of prototypeFields) {
        if (!fields.some((f) => f.name === field.name)) {
          fields.push(field)
        }
      }
    }

    currentPrototype = Object.getPrototypeOf(currentPrototype)
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
