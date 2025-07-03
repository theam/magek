import { Register, UUID } from '@booster-ai/common'
import { RegisterHandler } from './booster-register-handler.js'
import { Booster } from './index.js'
import { BoosterEntityTouched } from './core-concepts/touch-entity/events/booster-entity-touched.js'

export class BoosterTouchEntityHandler {
  public static async touchEntity(entityName: string, entityId: UUID): Promise<void> {
    const requestID = UUID.generate()
    const register = new Register(requestID, {}, RegisterHandler.flush)
    register.events(new BoosterEntityTouched(entityName, entityId))
    return RegisterHandler.handle(Booster.config, register)
  }
}
