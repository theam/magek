import { MagekConfig, TraceActionTypes, TraceInfo, TraceTypes, UUID } from '@magek/common'
import { isTraceEnabled, notifyTrace } from '../trace-notifier'
import { Magek } from '../../magek'

/**
 * Stage 3 method decorator context
 */
interface Stage3MethodContext {
  kind: 'method'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Decorator for tracing method execution.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param actionType - The type of action being traced
 * @param description - Optional description for the trace
 */
export function trace(actionType: string = TraceActionTypes.CUSTOM, description?: string) {
  return <T extends (...args: any[]) => Promise<any>>(
    originalMethod: T,
    context: Stage3MethodContext
  ): T => {
    const methodName = String(context.name)

    // Return a new function that wraps the original
    const wrappedMethod = async function (this: unknown, ...args: unknown[]) {
      const config = Magek.config
      const tracerConfigured = isTraceEnabled(actionType, config)
      if (!tracerConfigured) {
        return await originalMethod.apply(this, args)
      }
      const parameters = buildParameters(this, methodName, args, description, config)
      const startTime = new Date().getTime()
      await notifyTrace(TraceTypes.START, actionType, parameters, config)
      try {
        return await originalMethod.apply(this, args)
      } finally {
        parameters.elapsedInvocationMillis = new Date().getTime() - startTime
        await notifyTrace(TraceTypes.END, actionType, parameters, config)
      }
    }

    return wrappedMethod as T
  }
}

function buildParameters(
  instance: unknown,
  methodName: string,
  args: unknown[],
  description: string | undefined,
  config: MagekConfig
) {
  let internal: { target: unknown; descriptor: PropertyDescriptor } | undefined = undefined
  if (config && config.traceConfiguration.includeInternal) {
    internal = {
      target: instance,
      descriptor: {}, // Stage 3 decorators don't have access to property descriptors
    }
  }
  const parameters: TraceInfo = {
    className: getClassName(instance),
    methodName: methodName,
    args: args,
    description: description,
    traceId: UUID.generate(),
    internal: internal,
  }
  return parameters
}

// Get class name for instances and static methods
function getClassName(target: unknown) {
  // @ts-ignore
  return target?.prototype?.constructor?.name ?? target?.constructor?.name ?? ''
}

// Re-export with PascalCase alias for backward compatibility during migration
// TODO: Remove this alias after all usages have been updated to @trace
export { trace as Trace }
