import { AnyClass } from '../typelevel.js'
import { ScheduleInterface } from '../schedule.js'
import { Register } from './register.js'

export interface ScheduledCommandInterface extends AnyClass {
  handle(register: Register): Promise<void>
}

export interface ScheduledCommandMetadata {
  readonly class: ScheduledCommandInterface
  readonly scheduledOn: ScheduleInterface
}
