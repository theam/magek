import { FieldMetadata } from '@magek/common'
import { FIELDS_METADATA_KEY, DecoratorMetadataObject, getFieldMetadata, setFieldMetadata } from './decorator-types'

// Re-export types for convenience
export type {
  ClassDecoratorContext,
  FieldDecoratorContext,
  MethodDecoratorContext,
  GetterDecoratorContext,
  DecoratorMetadataObject,
} from './decorator-types'

/**
 * Transfer field metadata from decorator context.metadata to WeakMap storage.
 * Must be called by class decorators to make field metadata accessible.
 */
export function transferFieldMetadata(
  classType: Function,
  contextMetadata?: DecoratorMetadataObject
): void {
  if (!contextMetadata) return

  const fields = contextMetadata[FIELDS_METADATA_KEY] as FieldMetadata[] | undefined
  if (!fields || fields.length === 0) return

  const existingFields = getFieldMetadata(classType)

  for (const field of fields) {
    if (!existingFields.some((f) => f.name === field.name)) {
      existingFields.push(field)
    }
  }

  setFieldMetadata(classType, existingFields)
}
