import { ReadModel, Projects } from '@magek/core'
import { Field, UUID, ProjectionResult } from '@magek/common'
import { Account } from '../entities/account'

@ReadModel({
  authorize: 'all', // Allow all for testing purposes
})
export class AccountBalance {
  @Field(() => UUID)
  public readonly id!: UUID

  @Field(() => Number)
  public readonly balance!: number

  @Projects(Account, 'id')
  public static projectAccount(account: Account): ProjectionResult<AccountBalance> {
    return {
      id: account.id,
      balance: account.balance,
    }
  }
}
