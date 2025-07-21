import {
  Class,
  ReadModelAuthorizer,
  ReadModelFilterHooks,
  ReadModelInterface,
  ReadModelRoleAccess,
} from '@magek/common'
import { Booster } from '../magek'
import { BoosterAuthorizer } from '../authorizer'
import { getClassMetadata } from './metadata'
import { getMetadata, defineMetadata } from '@magek/metadata'

/**
 * Decorator to register a class as a ReadModel
 * @param attributes
 */
export function ReadModel(
  attributes: ReadModelRoleAccess & ReadModelFilterHooks
): (readModelClass: Class<ReadModelInterface>, context?: ClassDecoratorContext) => void {
  return (readModelClass) => {
    Booster.configureCurrentEnv((config): void => {
      if (config.readModels[readModelClass.name]) {
        throw new Error(`A read model called ${readModelClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      const authorizer = BoosterAuthorizer.build(attributes) as ReadModelAuthorizer
      const classMetadata = getClassMetadata(readModelClass)
      const dynamicDependencies =
        getMetadata<Record<string, string[]>>('dynamic:dependencies', readModelClass as object) || {}

      // Combine properties with dynamic dependencies
      const properties = classMetadata.fields.map((field: any) => {
        return {
          ...field,
          dependencies: dynamicDependencies[field.name] || [],
        }
      })

      config.readModels[readModelClass.name] = {
        class: readModelClass,
        properties,
        authorizer,
        before: attributes.before ?? [],
      }
    })
  }
}

interface CalculatedFieldOptions {
  dependsOn: string[]
}

/**
 * Decorator to mark a property as a calculated field with dependencies.
 * @param options - A `CalculatedFieldOptions` object indicating the dependencies.
 */
export function CalculatedField(options: CalculatedFieldOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const existingDependencies =
      getMetadata<Record<string | symbol, string[]>>(
        'dynamic:dependencies',
        target.constructor as object
      ) || {}
    existingDependencies[propertyKey] = options.dependsOn
    defineMetadata('dynamic:dependencies', existingDependencies, target.constructor as object)
  }
}
