 
import { Booster } from '../booster.js'
import {
  CommandFilterHooks,
  QueryAuthorizer,
  QueryInterface,
  QueryMetadata,
  QueryRoleAccess,
} from '@booster-ai/common'
import { getClassMetadata } from './metadata.js'
import { BoosterAuthorizer } from '../booster-authorizer.js'

export function Query(
  attributes: QueryRoleAccess & CommandFilterHooks
): <TCommand>(queryClass: QueryInterface<TCommand>) => void {
  return (queryClass) => {
    Booster.configureCurrentEnv((config): void => {
      if (config.queryHandlers[queryClass.name]) {
        throw new Error(`A query called ${queryClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      const metadata = getClassMetadata(queryClass)
      config.queryHandlers[queryClass.name] = {
        class: queryClass,
        authorizer: BoosterAuthorizer.build(attributes) as QueryAuthorizer,
        properties: metadata.fields,
        methods: metadata.methods,
        before: attributes.before ?? [],
      } as QueryMetadata
    })
  }
}
