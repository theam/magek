import { Magek } from '../magek'
import { Class, RoleMetadata, RoleInterface } from '@magek/common'

/**
 * Stage 3 class decorator context
 */
interface Stage3ClassContext {
  kind: 'class'
  name: string | undefined
  metadata: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 class decorator context
 */
function isStage3ClassContext(arg: unknown): arg is Stage3ClassContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3ClassContext).kind === 'class' &&
    'metadata' in arg
  )
}

/**
 * Decorator to mark a class as a Magek Role.
 * Roles define authorization and authentication configurations.
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * @param roleMetadata - Role configuration including auth settings
 * @returns A class decorator function
 */
export function Role(
  roleMetadata: RoleMetadata = { auth: {} }
): (role: Class<RoleInterface>, context?: Stage3ClassContext) => void {
  return (role, context?): void => {
    // Stage 3 context is received but we don't need to do anything special with it
    // Just validate it if present
    if (context !== undefined && !isStage3ClassContext(context)) {
      // If a second argument is passed but it's not a valid Stage 3 context, ignore it
    }

    Magek.configureCurrentEnv((config): void => {
      config.roles[role.name] = roleMetadata
    })
  }
}
