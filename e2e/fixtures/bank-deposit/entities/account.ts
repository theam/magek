import { Entity, reduces, field } from '@magek/core'
import { UUID } from '@magek/common'
import { MoneyDeposited } from '../events/money-deposited'

@Entity({
  authorizeReadEvents: 'all', // Allow all for testing purposes
})
export class Account {
  @field(() => UUID)
  public readonly id!: UUID

  @field(() => Number)
  public readonly balance!: number

  @reduces(MoneyDeposited)
  public static reduceMoneyDeposited(event: MoneyDeposited, currentAccount?: Account): Account {
    const currentBalance = currentAccount?.balance ?? 0
    return {
      id: event.accountId,
      balance: currentBalance + event.amount,
    } as Account
  }
}
