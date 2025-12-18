import { Event } from '@magek/core'
import { Field, UUID } from '@magek/common'

@Event
export class MoneyDeposited {
  constructor(
    readonly accountId: UUID,
    readonly amount: number
  ) {}

  @Field(() => UUID)
  public readonly accountId!: UUID

  @Field(() => Number)
  public readonly amount!: number

  public entityID(): UUID {
    return this.accountId
  }
}
