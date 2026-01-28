import 'reflect-metadata'
import { ClassType } from '@magek/common'

type TypeFunction = () => ClassType | Function | [ClassType | Function]

// Symbol used by Stage 3 decorators to store method return type metadata
const METHOD_RETURNS_KEY = Symbol.for('magek:method:returns')

/**
 * Stage 3 method decorator context
 */
interface Stage3MethodContext {
  kind: 'method'
  name: string | symbol
  access: { get: () => unknown }
  static: boolean
  private: boolean
  metadata: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 method decorator context
 */
function isStage3MethodContext(arg: unknown): arg is Stage3MethodContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3MethodContext).kind === 'method' &&
    'name' in arg
  )
}

/**
 * Decorator to specify the return type of a static method (like command handler's `handle`).
 * This enables automatic return type inference for GraphQL schema generation.
 * 
 * TypeScript's emitDecoratorMetadata cannot capture generic type parameters like `Promise<UUID>`,
 * so this decorator allows explicit type specification.
 *
 * @param typeFunction - Optional function that returns the return type. If not provided,
 *                       will attempt to use emitDecoratorMetadata (works for non-generic types).
 *
 * @example
 * ```typescript
 * import { UUID } from '@magek/common'
 * 
 * @Command({ authorize: 'all' })
 * export class CreateNote {
 *   @Returns(() => UUID)
 *   public static async handle(command: CreateNote, register: Register): Promise<UUID> {
 *     const noteId = UUID.generate()
 *     register.events(new NoteCreated(noteId))
 *     return noteId
 *   }
 * }
 * ```
 */
export function Returns(typeFunction?: TypeFunction): MethodDecorator {
  return (target: object | Function, propertyKey: string | symbol | Stage3MethodContext, descriptor?: PropertyDescriptor) => {
    // Handle Stage 3 decorators
    if (isStage3MethodContext(propertyKey)) {
      const context = propertyKey
      
      if (typeFunction) {
        // Store in context.metadata for later transfer by class decorator
        if (!context.metadata[METHOD_RETURNS_KEY]) {
          context.metadata[METHOD_RETURNS_KEY] = []
        }
        const methodReturns = context.metadata[METHOD_RETURNS_KEY] as Array<{ methodName: string; typeFunction: TypeFunction }>
        methodReturns.push({
          methodName: String(context.name),
          typeFunction,
        })
      }
      
      return descriptor
    }
    
    // Legacy decorator
    const classConstructor = target as Function
    const methodName = propertyKey as string | symbol

    if (typeFunction) {
      // Store the type function for later retrieval
      Reflect.defineMetadata('magek:returns:typeFunction', typeFunction, classConstructor, methodName)
    }
    
    // TypeScript's emitDecoratorMetadata will automatically add design:returntype metadata
    // which will be read by the field-metadata-reader
    return descriptor
  }
}
