import { Booster } from '../magek'
import { Class, RoleMetadata, RoleInterface } from '@magek/common'

/**
 * Annotation to tell Booster which classes represent your roles
 * @param roleMetadata
 */
export function Role(roleMetadata: RoleMetadata = { auth: {} }): (role: Class<RoleInterface>) => void {
  return (role): void => {
    Booster.configureCurrentEnv((config): void => {
      config.roles[role.name] = roleMetadata
    })
  }
}
