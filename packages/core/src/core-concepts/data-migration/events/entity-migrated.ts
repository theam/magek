import { EntityInterface, Instance, UUID } from '@magek/common'

export class MagekEntityMigrated {
  public constructor(
    readonly oldEntityName: string,
    readonly oldEntityId: UUID,
    readonly newEntityName: string,
    readonly newEntity: Instance & EntityInterface
  ) {}

  public entityID(): UUID {
    return this.oldEntityId
  }
}
