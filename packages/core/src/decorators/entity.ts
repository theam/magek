import { Magek } from '../magek'
import {
  Class,
  EntityInterface,
  ReducerMetadata,
  EventInterface,
  EventStreamRoleAccess,
  AnyClass,
  EventStreamAuthorizer,
} from '@magek/common'
import { MagekAuthorizer } from '../authorizer'
import { ClassDecoratorContext, MethodDecoratorContext } from './decorator-utils'
import { getNonExposedFields } from './metadata'

type EntityAttributes = EventStreamRoleAccess

// The craziness with the following both types (the param and return types of the @Entity decorator) is to achieve that either:
// - The @Entity decorator doesn't have parenthesis: THEN the decorator needs to accept a class as a parameter and return void
// - The @Entity decorator have parenthesis: THEN it needs to accept an object with attributes and return a function accepting a class as a parameter
type EntityDecoratorParam = AnyClass | EntityAttributes
type EntityDecoratorResult<TEntity, TParam> = TParam extends EntityAttributes
  ? (entityClass: Class<TEntity>, context: ClassDecoratorContext) => void
  : void

/**
 * Decorator to mark a class as a Magek Entity.
 * Entities represent the current state derived from events.
 *
 * @param classOrAttributes - Either the class itself or entity configuration attributes
 * @param context - Decorator context (when used without parentheses)
 * @returns A class decorator function or void if used without parentheses
 */
export function Entity<TEntity extends EntityInterface, TParam extends EntityDecoratorParam>(
  classOrAttributes: TParam,
  context?: ClassDecoratorContext
): EntityDecoratorResult<TEntity, TParam> {
  let authorizeReadEvents: EventStreamRoleAccess['authorizeReadEvents']

  // This function will be either returned or executed, depending on the parameters passed to the decorator
  const mainLogicFunction = (entityClass: Class<TEntity>, ctx?: ClassDecoratorContext): void => {
    Magek.configureCurrentEnv((config): void => {
      if (config.entities[entityClass.name]) {
        throw new Error(`An entity called ${entityClass.name} is already registered
        If you think that this is an error, try performing a clean build..`)
      }

      let eventStreamAuthorizer: EventStreamAuthorizer = MagekAuthorizer.denyAccess
      if (authorizeReadEvents === 'all') {
        eventStreamAuthorizer = MagekAuthorizer.allowAccess
      } else if (Array.isArray(authorizeReadEvents)) {
        eventStreamAuthorizer = MagekAuthorizer.authorizeRoles.bind(null, authorizeReadEvents)
      } else if (typeof authorizeReadEvents === 'function') {
        eventStreamAuthorizer = authorizeReadEvents
      }

      config.entities[entityClass.name] = {
        class: entityClass,
        eventStreamAuthorizer,
      }

      // Register non-exposed fields from context.metadata
      const nonExposedFields = getNonExposedFields(ctx?.metadata)
      if (nonExposedFields.length > 0) {
        config.nonExposedGraphQLMetadataKey[entityClass.name] = nonExposedFields
      }
    })
  }

  if (isEntityAttributes(classOrAttributes)) {
    authorizeReadEvents = classOrAttributes.authorizeReadEvents
    return ((entityClass: Class<TEntity>, ctx: ClassDecoratorContext) => {
      mainLogicFunction(entityClass, ctx)
    }) as EntityDecoratorResult<TEntity, TParam>
  }

  return mainLogicFunction(classOrAttributes as Class<TEntity>, context) as EntityDecoratorResult<TEntity, TParam>
}

function isEntityAttributes(param: EntityDecoratorParam): param is EntityAttributes {
  return 'authorizeReadEvents' in param
}

/**
 * Decorator to register an entity class method as a reducer function
 * for a specific event.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param eventClass The event that this method will react to
 */
export function reduces<TEvent extends EventInterface>(
  eventClass: Class<TEvent>
): <TEntity>(
  entityClassOrMethod: Function,
  context: MethodDecoratorContext
) => void {
  return (_method, context) => {
    // Stage 3 decorator - use addInitializer to get the class
    if (context.addInitializer) {
      context.addInitializer(function (this: Function) {
        // For static methods, 'this' is the class itself
        // For instance methods, 'this' is an instance and we need this.constructor
        const targetClass = context.static ? this : this.constructor
        registerReducer(eventClass.name, {
          class: targetClass as AnyClass,
          methodName: context.name.toString(),
        })
      })
    }
  }
}

function registerReducer(eventName: string, reducerMetadata: ReducerMetadata): void {
  Magek.configureCurrentEnv((config): void => {
    const reducerPath = config.reducers[eventName]
    if (reducerPath) {
      throw new Error(
        `Error registering reducer: The event ${eventName} was already registered to be reduced by method ${reducerPath.methodName} in the entity ${reducerPath.class.name}.
        If you think that this is an error, try performing a clean build.`
      )
    }

    config.reducers[eventName] = reducerMetadata
  })
}
