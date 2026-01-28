import 'reflect-metadata'
import { AnyClass, FieldMetadata, ClassMetadata, PropertyMetadata, TypeMetadata, ClassType } from '@magek/common'

// Symbol used by Stage 3 decorators to store field metadata
const FIELDS_KEY = Symbol.for('magek:fields')

// Symbol.metadata may not be defined in all TypeScript lib versions
// Use a well-known symbol that Stage 3 decorators use
const METADATA_KEY: symbol = (Symbol as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata')

/**
 * Extract TypeMetadata from a @Field() decorator's metadata
 */
function extractTypeMetadata(fieldMeta: FieldMetadata, isGetter: boolean = false): TypeMetadata {
  let targetType: any
  let isArray = false
  let isReadonlyArray = false

  // If typeFunction is provided, use it
  if (fieldMeta.typeFunction) {
    const result = fieldMeta.typeFunction()

    // Handle array syntax: @Field(type => [String])
    if (Array.isArray(result)) {
      isArray = true
      targetType = result[0]
    } else {
      targetType = result
    }
  } else {
    // Fall back to design:type from emitDecoratorMetadata
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

  // Then walk up the prototype chain for legacy decorator metadata
  let currentPrototype = classType.prototype

  while (currentPrototype && currentPrototype !== Object.prototype) {
    const constructor = currentPrototype.constructor as { __magek_fields__?: FieldMetadata[] }

    // Try Reflect.getMetadata first, then fallback to __magek_fields__
    let prototypeFields: FieldMetadata[] = []
    if (typeof (Reflect as { getMetadata?: Function }).getMetadata === 'function') {
      prototypeFields = Reflect.getMetadata('magek:fields', constructor) || []
    }
    // Also check fallback property
    if (prototypeFields.length === 0 && constructor.__magek_fields__) {
      prototypeFields = constructor.__magek_fields__
    }

    // Add fields that aren't already in the list (child overrides parent)
    for (const field of prototypeFields) {
      if (!fields.some((f) => f.name === field.name)) {
        fields.push(field)
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
      // This is a getter, check if it has @CalculatedField metadata
      const dependencies: string[] =
        Reflect.getMetadata('dynamic:dependencies', classType)?.[propertyKey] || []

      // Get return type from design:returntype if available
      const returnType = Reflect.getMetadata('design:returntype', prototype, propertyKey)

      const typeMetadata: TypeMetadata = analyzeType(returnType || Object, {
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
 * Get all static methods from a class
 */
function getAllStaticMethods(classType: AnyClass): PropertyMetadata[] {
  const staticMethods: PropertyMetadata[] = []

  // Get property descriptors for static members
  const descriptors = Object.getOwnPropertyDescriptors(classType)

  for (const [propertyKey, descriptor] of Object.entries(descriptors)) {
    // Skip constructor and non-function properties
    if (propertyKey === 'constructor' || typeof descriptor.value !== 'function') {
      continue
    }

    // Check if there's a custom type function from @Returns decorator
    const typeFunction = Reflect.getMetadata('magek:returns:typeFunction', classType, propertyKey)
    
    let typeMetadata: TypeMetadata

    if (typeFunction) {
      // Use the explicitly provided type function
      const result = typeFunction()
      const targetType = Array.isArray(result) ? result[0] : result

      typeMetadata = analyzeType(targetType, {
        isNullable: false,
        isGetAccessor: false,
        isArray: Array.isArray(result),
        isReadonlyArray: false,
      })

      // Wrap in Promise type to match async function signatures
      typeMetadata = {
        name: 'Promise',
        typeGroup: 'Class',
        typeName: 'Promise',
        parameters: [typeMetadata],
        isNullable: false,
        isGetAccessor: false,
        type: Promise as any,
      }
    } else {
      // Fall back to design:returntype if available
      const returnType = Reflect.getMetadata('design:returntype', classType, propertyKey)

      if (!returnType) {
        // No metadata available, skip this method
        continue
      }

      typeMetadata = analyzeType(returnType, {
        isNullable: false,
        isGetAccessor: false,
        isArray: false,
        isReadonlyArray: false,
      })
    }

    staticMethods.push({
      name: propertyKey,
      typeInfo: typeMetadata,
      dependencies: [],
    })
  }

  return staticMethods
}

/**
 * Build ClassMetadata from @Field() decorators
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

  // Get getter methods (for @CalculatedField)
  const getters = getAllGetters(classType)

  // Get static methods (for command handlers)
  const staticMethods = getAllStaticMethods(classType)

  // Combine getters and static methods
  const methods = [...getters, ...staticMethods]

  return {
    name: classType.name,
    type: classType,
    fields,
    methods,
  }
}
