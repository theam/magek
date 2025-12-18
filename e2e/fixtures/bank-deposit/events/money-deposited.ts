import { Event } from '@magek/core'
import { Field, UUID } from '@magek/common'

@Event
export class MoneyDeposited {
  @Field(() => UUID)
  public readonly accountId!: UUID

  @Field(() => Number)
  public readonly amount!: number

  constructor(accountId: UUID, amount: number) {
    this.accountId = accountId
    this.amount = amount
  }

  public entityID(): UUID {
    return this.accountId
  }
}
