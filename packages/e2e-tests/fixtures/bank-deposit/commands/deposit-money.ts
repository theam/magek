import { Command, field } from '@magek/core'
import { UUID, Register } from '@magek/common'
import { MoneyDeposited } from '../events/money-deposited'

@Command({
  authorize: 'all', // Allow all for testing purposes
})
export class DepositMoney {
  @field(() => UUID)
  public readonly accountId!: UUID

  @field(() => Number)
  public readonly amount!: number

  public static async handle(command: DepositMoney, register: Register): Promise<void> {
    // Register the event that money was deposited
    register.events(
      new MoneyDeposited(command.accountId, command.amount)
    )
  }
}
