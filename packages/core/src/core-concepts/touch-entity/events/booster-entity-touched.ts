import { UUID } from '@magek/common'

export class BoosterEntityTouched {
  public constructor(readonly entityName: string, readonly entityId: UUID) {}

  public entityID(): UUID {
    return this.entityId
  }
}
