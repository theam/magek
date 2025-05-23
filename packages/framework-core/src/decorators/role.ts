import { Booster } from '../booster'
import { Class, RoleMetadata, RoleInterface } from '@booster-ai/common'

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
