import { Magek } from '../magek'
import { Class, RoleMetadata, RoleInterface } from '@magek/common'

/**
 * Annotation to tell Magek which classes represent your roles
 * @param roleMetadata
 */
export function Role(roleMetadata: RoleMetadata = { auth: {} }): (role: Class<RoleInterface>) => void {
  return (role): void => {
    Magek.configureCurrentEnv((config): void => {
      config.roles[role.name] = roleMetadata
    })
  }
}
