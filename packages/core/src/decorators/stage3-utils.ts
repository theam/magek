import { FieldMetadata } from '@magek/common'

// Symbol used by Stage 3 decorators to store field metadata
const FIELDS_KEY = Symbol.for('magek:fields')

/**
 * Stage 3 class decorator context
 */
export interface Stage3ClassContext {
  kind: 'class'
  name: string | undefined
  metadata?: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Stage 3 method decorator context
 */
export interface Stage3MethodContext {
  kind: 'method'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Transfer field metadata from Stage 3 decorator context.metadata to the class constructor.
 * This is needed because Symbol.metadata is not available in Node.js, so Stage 3 decorators
 * need an explicit step to make field metadata accessible on the class.
 */
export function transferStage3FieldMetadata(
  classType: Function,
  contextMetadata?: Record<string | symbol, unknown>
): void {
  if (!contextMetadata) return

  const fields = contextMetadata[FIELDS_KEY] as FieldMetadata[] | undefined
  if (fields && fields.length > 0) {
    const ctorWithFields = classType as { __magek_fields__?: FieldMetadata[] }
    if (!ctorWithFields.__magek_fields__) {
      ctorWithFields.__magek_fields__ = []
    }
    // Add fields that aren't already present
    for (const field of fields) {
      if (!ctorWithFields.__magek_fields__.some((f) => f.name === field.name)) {
        ctorWithFields.__magek_fields__.push(field)
      }
    }
  }
}
