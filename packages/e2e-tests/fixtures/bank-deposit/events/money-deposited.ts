import { Event, field } from '@magek/core'
import { UUID } from '@magek/common'

@Event
export class MoneyDeposited {
  @field(() => UUID)
  public readonly accountId!: UUID

  @field(() => Number)
  public readonly amount!: number

  constructor(accountId: UUID, amount: number) {
    this.accountId = accountId
    this.amount = amount
  }

  public entityID(): UUID {
    return this.accountId
  }
}
