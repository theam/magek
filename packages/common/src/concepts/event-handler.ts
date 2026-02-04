import { Register } from './register'
import { EventInterface } from './event'
import { NotificationInterface } from './notification'
import { Class } from '../typelevel'

/**
 * Interface for event handler classes.
 * Event handlers must have a static `handle` method that processes events.
 *
 * Similar to CommandInterface, this describes the class itself (with static methods),
 * not instances of the class.
 */
export interface EventHandlerInterface extends Class<unknown> {
  handle(event: EventInterface | NotificationInterface, register: Register): Promise<void>
}
