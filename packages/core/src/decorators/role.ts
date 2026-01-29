import { Magek } from '../magek'
import { Class, RoleMetadata, RoleInterface } from '@magek/common'
import { Stage3ClassContext } from './stage3-utils'

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
): (role: Class<RoleInterface>, context: Stage3ClassContext) => void {
  return (role): void => {
    Magek.configureCurrentEnv((config): void => {
      config.roles[role.name] = roleMetadata
    })
  }
}
