 
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
import { isStage3MethodContext, Stage3MethodContext } from './stage3-utils'

type EntityAttributes = EventStreamRoleAccess

// The craziness with the following both types (the param and return types of the @Entity decorator) is to achieve that either:
// - The @Entity decorator doesn't have parenthesis: THEN the decorator needs to accept a class as a parameter and return void
// - The @Entity decorator have parenthesis: THEN it needs to accept an object with attributes and return a function accepting a class as a parameter
type EntityDecoratorParam = AnyClass | EntityAttributes
type EntityDecoratorResult<TEntity, TParam> = TParam extends EntityAttributes
  ? (entityClass: Class<TEntity>) => void
  : void

/**
 * Decorator to mark a class as a Magek Entity.
 * Entities represent the current state derived from events.
 *
 * @param classOrAttributes - Either the class itself or entity configuration attributes
 * @returns A class decorator function or void if used without parentheses
 */
export function Entity<TEntity extends EntityInterface, TParam extends EntityDecoratorParam>(
  classOrAttributes: TParam
): EntityDecoratorResult<TEntity, TParam> {
  let authorizeReadEvents: EventStreamRoleAccess['authorizeReadEvents']

  // This function will be either returned or executed, depending on the parameters passed to the decorator
  const mainLogicFunction = (entityClass: Class<TEntity>): void => {
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
    })
  }

  if (isEntityAttributes(classOrAttributes)) {
    authorizeReadEvents = classOrAttributes.authorizeReadEvents
    return mainLogicFunction as EntityDecoratorResult<TEntity, TParam>
  }

  return mainLogicFunction(classOrAttributes as Class<TEntity>) as EntityDecoratorResult<TEntity, TParam>
}

function isEntityAttributes(param: EntityDecoratorParam): param is EntityAttributes {
  return 'authorizeReadEvents' in param
}

/**
 * Stage 3 method decorator context
 */

/**
 * Type guard to detect Stage 3 method decorator context
 */

/**
 * Decorator to register an entity class method as a reducer function
 * for a specific event.
 *
 * @param eventClass The event that this method will react to
 */
export function Reduces<TEvent extends EventInterface>(
  eventClass: Class<TEvent>
): <TEntity>(
  entityClassOrMethod: Class<TEntity> | Function,
  methodNameOrContext: string | Stage3MethodContext,
  methodDescriptor?: ReducerMethod<TEvent, TEntity>
) => void {
  return (entityClassOrMethod, methodNameOrContext, _methodDescriptor?) => {
    // Detect Stage 3 vs Legacy decorator
    if (isStage3MethodContext(methodNameOrContext)) {
      // Stage 3 decorator - use addInitializer to get the class
      const context = methodNameOrContext
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
    } else {
      // Legacy decorator
      registerReducer(eventClass.name, {
        class: entityClassOrMethod as AnyClass,
        methodName: methodNameOrContext as string,
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

type ReducerMethod<TEvent, TEntity> =
  | TypedPropertyDescriptor<(event: TEvent, entity: TEntity) => TEntity>
  | TypedPropertyDescriptor<(event: TEvent, entity?: TEntity) => TEntity>
