import { Magek } from '../magek'
import { Class, RoleMetadata, RoleInterface } from '@magek/common'
import { ClassDecoratorContext } from './decorator-types'

/**
 * Decorator to mark a class as a Magek Role.
 * Roles define authorization and authentication configurations.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param roleMetadata - Role configuration including auth settings
 * @returns A class decorator function
 */
export function Role(
  roleMetadata: RoleMetadata = { auth: {} }
): (role: Class<RoleInterface>, context: ClassDecoratorContext) => void {
  return (role): void => {
    Magek.configureCurrentEnv((config): void => {
      config.roles[role.name] = roleMetadata
    })
  }
}
