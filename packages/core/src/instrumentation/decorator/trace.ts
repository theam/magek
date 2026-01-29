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
 * Type guard for Stage 3 method context
 */
function isStage3MethodContext(arg: unknown): arg is Stage3MethodContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3MethodContext).kind === 'method' &&
    'name' in arg
  )
}

export function Trace(actionType: string = TraceActionTypes.CUSTOM, description?: string) {
  // Return type is 'any' to support both legacy (returns PropertyDescriptor) and Stage 3 (returns Function) decorators
  return (
    targetOrMethod: unknown,
    memberOrContext: string | Stage3MethodContext,
    descriptor?: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>
  ): any => {
    // Detect Stage 3 decorator
    if (isStage3MethodContext(memberOrContext)) {
      // Stage 3: targetOrMethod is the actual method function
      const originalMethod = targetOrMethod as (...args: unknown[]) => Promise<unknown>
      const methodName = String(memberOrContext.name)

      // Return a new function that wraps the original
      return async function (this: unknown, ...args: unknown[]) {
        const config = Magek.config
        const tracerConfigured = isTraceEnabled(actionType, config)
        if (!tracerConfigured) {
          return await originalMethod.apply(this, args)
        }
        const parameters = buildParametersStage3(this, methodName, args, description, config)
        const startTime = new Date().getTime()
        await notifyTrace(TraceTypes.START, actionType, parameters, config)
        try {
          return await originalMethod.apply(this, args)
        } finally {
          parameters.elapsedInvocationMillis = new Date().getTime() - startTime
          await notifyTrace(TraceTypes.END, actionType, parameters, config)
        }
      }
    }

    // Legacy decorator
    const target = targetOrMethod
    const member = memberOrContext as string

    // Handle case where descriptor is undefined (can happen with certain TypeScript/ESM configurations)
    if (!descriptor) {
      return
    }
    const originalMethod = descriptor.value
    if (!originalMethod) {
      return descriptor
    }
    descriptor.value = async function (...args: Array<unknown>) {
      const config = Magek.config
      const tracerConfigured = isTraceEnabled(actionType, config)
      if (!tracerConfigured) {
        return await originalMethod.apply(this, args)
      }
      const parameters = buildParameters(target, member, args, description, descriptor, config)
      const startTime = new Date().getTime()
      await notifyTrace(TraceTypes.START, actionType, parameters, config)
      try {
        return await originalMethod.apply(this, args)
      } finally {
        parameters.elapsedInvocationMillis = new Date().getTime() - startTime
        await notifyTrace(TraceTypes.END, actionType, parameters, config)
      }
    }
    return descriptor
  }
}

function buildParameters(
  target: unknown,
  member: string,
  args: unknown[],
  description: string | undefined,
  descriptor: PropertyDescriptor,
  config: MagekConfig
) {
  let internal = undefined
  if (config && config.traceConfiguration.includeInternal) {
    internal = {
      target: target,
      descriptor: descriptor,
    }
  }
  const parameters: TraceInfo = {
    className: getClassName(target),
    methodName: member,
    args: args,
    description: description,
    traceId: UUID.generate(),
    internal: internal,
  }
  return parameters
}

function buildParametersStage3(
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
