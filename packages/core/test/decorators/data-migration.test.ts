import { expect } from '../expect'
import { DataMigration } from '../../src/decorators/'
import { Magek } from '../../src'
import { MagekConfig, Register } from '@magek/common'

describe('the `DataMigration` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: MagekConfig) => {
      for (const propName in config.dataMigrationHandlers) {
        delete config.dataMigrationHandlers[propName]
      }
    })
  })

  it('registers the data migration in config.dataMigrationHandlers', () => {
    @DataMigration({ order: 1 })
    class AddDefaultRoles {
      public static async start(_register: Register): Promise<void> {
        // Migration logic
      }
    }

    const migrationMetadata = Magek.config.dataMigrationHandlers['AddDefaultRoles']

    expect(migrationMetadata).to.be.an('object')
    expect(migrationMetadata.class).to.equal(AddDefaultRoles)
    expect(migrationMetadata.migrationOptions).to.deep.equal({ order: 1 })
  })

  it('stores the migration order correctly', () => {
    @DataMigration({ order: 5 })
    class UpdateUserSchema {
      public static async start(_register: Register): Promise<void> {}
    }

    @DataMigration({ order: 10 })
    class MigrateUserData {
      public static async start(_register: Register): Promise<void> {}
    }

    expect(Magek.config.dataMigrationHandlers['UpdateUserSchema'].migrationOptions.order).to.equal(5)
    expect(Magek.config.dataMigrationHandlers['MigrateUserData'].migrationOptions.order).to.equal(10)

    // Suppress unused variable warnings
    void UpdateUserSchema
    void MigrateUserData
  })

  it('allows registering multiple data migrations', () => {
    @DataMigration({ order: 1 })
    class FirstMigration {
      public static async start(_register: Register): Promise<void> {}
    }

    @DataMigration({ order: 2 })
    class SecondMigration {
      public static async start(_register: Register): Promise<void> {}
    }

    @DataMigration({ order: 3 })
    class ThirdMigration {
      public static async start(_register: Register): Promise<void> {}
    }

    expect(Magek.config.dataMigrationHandlers['FirstMigration'].class).to.equal(FirstMigration)
    expect(Magek.config.dataMigrationHandlers['SecondMigration'].class).to.equal(SecondMigration)
    expect(Magek.config.dataMigrationHandlers['ThirdMigration'].class).to.equal(ThirdMigration)
  })

  it('throws an error when the same migration is registered twice', () => {
    @DataMigration({ order: 1 })
    class DuplicateMigration {
      public static async start(_register: Register): Promise<void> {}
    }

    expect(() => {
      // Re-registering a migration with the same name should throw
      Magek.configureCurrentEnv((config: MagekConfig) => {
        if (config.dataMigrationHandlers['DuplicateMigration']) {
          throw new Error(`A data migration called DuplicateMigration is already registered.
        If you think that this is an error, try performing a clean build.`)
        }
        config.dataMigrationHandlers['DuplicateMigration'] = {
          class: DuplicateMigration,
          migrationOptions: { order: 2 },
        }
      })
    }).to.throw(/already registered/)
  })

  it('stores migration with order 0 correctly', () => {
    @DataMigration({ order: 0 })
    class InitialSetup {
      public static async start(_register: Register): Promise<void> {}
    }

    const migrationMetadata = Magek.config.dataMigrationHandlers['InitialSetup']

    expect(migrationMetadata.migrationOptions.order).to.equal(0)

    // Suppress unused variable warning
    void InitialSetup
  })

  it('stores migration with high order number correctly', () => {
    @DataMigration({ order: 9999 })
    class FinalCleanup {
      public static async start(_register: Register): Promise<void> {}
    }

    const migrationMetadata = Magek.config.dataMigrationHandlers['FinalCleanup']

    expect(migrationMetadata.migrationOptions.order).to.equal(9999)

    // Suppress unused variable warning
    void FinalCleanup
  })
})
