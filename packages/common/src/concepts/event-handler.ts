import { Register } from './register.js'
import { EventInterface } from './event.js'
import { NotificationInterface } from './notification.js'

export interface EventHandlerInterface {
  handle(event: EventInterface | NotificationInterface, register: Register): Promise<void>
}
