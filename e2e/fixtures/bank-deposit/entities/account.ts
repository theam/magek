import { Entity, Reduces } from '@magek/core'
import { Field, UUID } from '@magek/common'
import { MoneyDeposited } from '../events/money-deposited'

@Entity({
  authorizeReadEvents: 'all', // Allow all for testing purposes
})
export class Account {
  @Field(() => UUID)
  public readonly id!: UUID

  @Field(() => Number)
  public readonly balance!: number

  @Reduces(MoneyDeposited)
  public static reduceMoneyDeposited(event: MoneyDeposited, currentAccount?: Account): Account {
    const currentBalance = currentAccount?.balance ?? 0
    return {
      id: event.accountId,
      balance: currentBalance + event.amount,
    } as Account
  }
}
