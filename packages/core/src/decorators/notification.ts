import { Class, NotificationInterface } from '@magek/common'
import { Magek } from '../magek'
import { getFunctionArguments } from './metadata'

export type NotificationOptions = {
  topic?: string
}

/**
 * Stage 3 field decorator context
 */
interface Stage3FieldContext {
  kind: 'field'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 field decorator context
 */
function isStage3FieldContext(arg: unknown): arg is Stage3FieldContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3FieldContext).kind === 'field' &&
    'name' in arg
  )
}

// Symbol for storing partition key in Stage 3 metadata
const PARTITION_KEY_SYMBOL = Symbol.for('magek:partitionKey')

/**
 * Decorator to mark a class as a Magek Notification.
 * Notifications are events that can be published to external systems.
 *
 * @param options - Optional configuration for the notification (e.g., topic name)
 * @returns A class decorator function
 */
export const Notification =
  <TEvent extends NotificationInterface>(options?: NotificationOptions) =>
  (eventClass: Class<TEvent>, context?: { kind: 'class'; metadata?: Record<string | symbol, unknown> }): void => {
    // Handle Stage 3: transfer partition key from context.metadata to config
    if (context && context.kind === 'class' && context.metadata && context.metadata[PARTITION_KEY_SYMBOL]) {
      const propertyName = context.metadata[PARTITION_KEY_SYMBOL] as string
      Magek.configureCurrentEnv((config): void => {
        config.partitionKeys[eventClass.name] = propertyName
      })
    }

    Magek.configureCurrentEnv((config): void => {
      if (config.notifications[eventClass.name] || config.events[eventClass.name]) {
        throw new Error(`A notification called ${eventClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }
      const topic = options?.topic ?? 'defaultTopic'
      if (topic) {
        config.eventToTopic[eventClass.name] = topic
        config.topicToEvent[topic] = eventClass.name
      }
      config.notifications[eventClass.name] = {
        class: eventClass,
      }
    })
  }

/**
 * Optional decorator that marks a field in a notification class as the partition key.
 * This is useful if you want to guarantee that all the event handlers for notifications
 * of the same type will be executed in the same order.
 *
 * Can be used as both a parameter decorator and property decorator.
 */
export function partitionKey(
  target: Class<NotificationInterface> | Object | undefined,
  propertyKeyOrContext?: string | symbol | Stage3FieldContext,
  parameterIndex?: number
): void {
  // Stage 3 field decorator usage
  if (isStage3FieldContext(propertyKeyOrContext)) {
    const context = propertyKeyOrContext
    const propertyName = String(context.name)
    // Store in context.metadata so @Notification can read it
    if (context.metadata) {
      context.metadata[PARTITION_KEY_SYMBOL] = propertyName
    }
    return
  }

  // Property decorator usage: @partitionKey on a class property (legacy)
  if (propertyKeyOrContext !== undefined && parameterIndex === undefined && target) {
    const notificationClass = (target as Object).constructor as Class<NotificationInterface>
    const propertyName = String(propertyKeyOrContext)
    Magek.configureCurrentEnv((config): void => {
      if (config.partitionKeys[notificationClass.name] && config.partitionKeys[notificationClass.name] !== propertyName) {
        throw new Error(
          `Error trying to register a partition key named \`${propertyName}\` for class \`${
            notificationClass.name
          }\`. It already had the partition key \`${
            config.partitionKeys[notificationClass.name]
          }\` defined and only one partition key is allowed for each notification event.`
        )
      } else {
        config.partitionKeys[notificationClass.name] = propertyName
      }
    })
  }
  // Parameter decorator usage: @partitionKey on constructor parameter
  else if (parameterIndex !== undefined && target) {
    const notificationClass = target as Class<NotificationInterface>
    const args = getFunctionArguments(notificationClass)
    const propertyName = args[parameterIndex]
    Magek.configureCurrentEnv((config): void => {
      if (config.partitionKeys[notificationClass.name] && config.partitionKeys[notificationClass.name] !== propertyName) {
        throw new Error(
          `Error trying to register a partition key named \`${propertyName}\` for class \`${
            notificationClass.name
          }\`. It already had the partition key \`${
            config.partitionKeys[notificationClass.name]
          }\` defined and only one partition key is allowed for each notification event.`
        )
      } else {
        config.partitionKeys[notificationClass.name] = propertyName
      }
    })
  }
}
