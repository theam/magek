import { Class, NotificationInterface } from '@magek/common'
import { Magek } from '../magek'
import { FieldDecoratorContext, ClassDecoratorContext } from './decorator-types'

export type NotificationOptions = {
  topic?: string
}

// Symbol for storing partition key in decorator metadata
const PARTITION_KEY_SYMBOL = Symbol.for('magek:partitionKey')

/**
 * Decorator to mark a class as a Magek Notification.
 * Notifications are events that can be published to external systems.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param options - Optional configuration for the notification (e.g., topic name)
 * @returns A class decorator function
 */
export const Notification =
  <TEvent extends NotificationInterface>(options?: NotificationOptions) =>
  (eventClass: Class<TEvent>, context: ClassDecoratorContext): void => {
    // Handle Stage 3: transfer partition key from context.metadata to config
    if (context.metadata && context.metadata[PARTITION_KEY_SYMBOL]) {
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
 * Uses TC39 Stage 3 decorators.
 */
export function partitionKey(
  _value: undefined,
  context: FieldDecoratorContext
): void {
  const propertyName = String(context.name)
  // Store in context.metadata so @Notification can read it
  if (context.metadata) {
    context.metadata[PARTITION_KEY_SYMBOL] = propertyName
  }
}
