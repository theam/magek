import { ReadModel, projects, field } from '@magek/core'
import { UUID, ProjectionResult } from '@magek/common'
import { Account } from '../entities/account'

@ReadModel({
  authorize: 'all', // Allow all for testing purposes
})
export class AccountBalance {
  @field(() => UUID)
  public readonly id!: UUID

  @field(() => Number)
  public readonly balance!: number

  @projects(Account, 'id')
  public static projectAccount(account: Account): ProjectionResult<AccountBalance> {
    return {
      id: account.id,
      balance: account.balance,
    }
  }
}
