import { Register, UUID } from '@magek/common'
import { RegisterHandler } from './register-handler'
import { Magek } from './index'
import { MagekEntityTouched } from './core-concepts/touch-entity/events/entity-touched'

export class MagekTouchEntityHandler {
  public static async touchEntity(entityName: string, entityId: UUID): Promise<void> {
    const requestID = UUID.generate()
    const register = new Register(requestID, {}, RegisterHandler.flush)
    register.events(new MagekEntityTouched(entityName, entityId))
    return RegisterHandler.handle(Magek.config, register)
  }
}
