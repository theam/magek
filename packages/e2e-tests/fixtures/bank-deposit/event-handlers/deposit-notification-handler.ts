import { EventHandler } from '@magek/core'
import { Register } from '@magek/common'
import { MoneyDeposited } from '../events/money-deposited'

@EventHandler(MoneyDeposited)
export class DepositNotificationHandler {
  public static async handle(_event: MoneyDeposited, _register: Register): Promise<void> {
    // In a real application, this would send a notification
    // For the e2e test, we just need to verify the handler is registered
  }
}
