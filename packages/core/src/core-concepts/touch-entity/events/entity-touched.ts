import { UUID } from '@magek/common'

export class MagekEntityTouched {
  public constructor(readonly entityName: string, readonly entityId: UUID) {}

  public entityID(): UUID {
    return this.entityId
  }
}
