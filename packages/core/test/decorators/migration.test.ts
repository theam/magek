 
 
import { expect } from '../expect'
import { SchemaMigration, toVersion } from '../../src/decorators'
import { Magek } from '../../src'
import { SchemaMigrationMetadata } from '@magek/common'
import { getMetadata } from '@magek/common'

// Entities to test the annotations
class Product {}

class ProductV1 {}
class ProductV2 {
  public constructor(public field2: string, public field3: string) {}
}
class ProductV3 {
  public constructor(public field2: string, public field3: string, public field4: string) {}
}
class ProductV4 {
  public constructor(public field2: string, public field3: string, public field4: string, public field5: string) {}
}
class ProductV5 extends Product {} // This would be the current version

describe('the `toVersion` decorator', () => {
  it('throws when a version smaller than 1 is specified', () => {
    expect(() => {
      // @ts-ignore: Unused class
       
      class MigrateProduct {
        @toVersion(1, { fromSchema: ProductV1, toSchema: ProductV2 })
        public async changeField2(x: ProductV1): Promise<ProductV2> {
          return {} as any
        }
      }
    }).to.throw('Migration versions must always be greater than 1')
  })

  it('adds migrations as metadata to the migration class', () => {
    class MigrateProduct {
      @toVersion(2, { fromSchema: ProductV1, toSchema: ProductV2 })
      public async changeField2(x: ProductV1): Promise<ProductV2> {
        return {} as any
      }

      @toVersion(3, { fromSchema: ProductV2, toSchema: ProductV3 })
      public async changeField3(x: ProductV2): Promise<ProductV3> {
        return {} as any
      }
    }

    // Create an instance to trigger Stage 3 decorator initializers
    new MigrateProduct()

    const expectedMetadata: Array<SchemaMigrationMetadata> = [
      {
        migrationClass: MigrateProduct,
        methodName: 'changeField2',
        toVersion: 2,
        fromSchema: ProductV1,
        toSchema: ProductV2,
      },
      {
        migrationClass: MigrateProduct,
        methodName: 'changeField3',
        toVersion: 3,
        fromSchema: ProductV2,
        toSchema: ProductV3,
      },
    ]

    const gotMetadata = getMetadata<Array<SchemaMigrationMetadata>>(
      'magek:migrationsMethods',
      MigrateProduct
    )

    expect(gotMetadata).to.be.deep.equal(expectedMetadata)
  })
})

describe('the `Migrates` annotation', () => {
  afterEach(() => {
    Magek.configure('test', (config) => {
      config.appName = ''
      for (const propName in config.schemaMigrations) {
        delete config.schemaMigrations[propName]
      }
    })
  })

  it('adds several migrations correctly', () => {
    @SchemaMigration(Product)
    class MigrateProductFrom1To3 {
      @toVersion(2, { fromSchema: ProductV1, toSchema: ProductV2 })
      public async changeField2(x: ProductV1): Promise<ProductV2> {
        return {} as any
      }

      @toVersion(3, { fromSchema: ProductV2, toSchema: ProductV3 })
      public async changeField3(x: ProductV2): Promise<ProductV3> {
        return {} as any
      }
    }

    @SchemaMigration(Product)
    class MigrateProductFrom3To5 {
      @toVersion(5, { fromSchema: ProductV4, toSchema: ProductV5 })
      public async changeField5(x: ProductV4): Promise<ProductV5> {
        return {} as any
      }

      @toVersion(4, { fromSchema: ProductV3, toSchema: ProductV4 })
      public async changeField4(x: ProductV3): Promise<ProductV4> {
        return {} as any
      }
    }

    Magek.configure('test', (config) => {
      expect(Object.keys(config.schemaMigrations).length).to.be.equal(1)
      const productMigrations = config.schemaMigrations[Product.name]
      expect(productMigrations.size).to.be.equal(4)
      expect(productMigrations.get(2)).to.be.deep.equal({
        migrationClass: MigrateProductFrom1To3,
        methodName: 'changeField2',
        toVersion: 2,
        fromSchema: ProductV1,
        toSchema: ProductV2,
      })
      expect(productMigrations.get(3)).to.be.deep.equal({
        migrationClass: MigrateProductFrom1To3,
        methodName: 'changeField3',
        toVersion: 3,
        fromSchema: ProductV2,
        toSchema: ProductV3,
      })
      expect(productMigrations.get(4)).to.be.deep.equal({
        migrationClass: MigrateProductFrom3To5,
        methodName: 'changeField4',
        toVersion: 4,
        fromSchema: ProductV3,
        toSchema: ProductV4,
      })
      expect(productMigrations.get(5)).to.be.deep.equal({
        migrationClass: MigrateProductFrom3To5,
        methodName: 'changeField5',
        toVersion: 5,
        fromSchema: ProductV4,
        toSchema: ProductV5,
      })
    })
  })

  it('throws when a migration is duplicated', () => {
    @SchemaMigration(Product)
    // @ts-ignore: Unused class
     
    class MigrateProductFrom1To3 {
      @toVersion(2, { fromSchema: ProductV1, toSchema: ProductV2 })
      public async changeField2(x: ProductV1): Promise<ProductV2> {
        return {} as any
      }

      @toVersion(3, { fromSchema: ProductV2, toSchema: ProductV3 })
      public async changeField3(x: ProductV2): Promise<ProductV3> {
        return {} as any
      }
    }

    expect(() => {
      @SchemaMigration(Product)
      // @ts-ignore: Unused class
       
      class MigrateProductFrom3To5 {
        @toVersion(3, { fromSchema: ProductV2, toSchema: ProductV3 })
        public async changeField5(x: ProductV2): Promise<ProductV3> {
          return {} as any
        }
      }
    }).to.throw(/There is an already defined migration for version 3/)
  })

  it('throws when no migration methods are found', () => {
    expect(() => {
      @SchemaMigration(Product)
      // @ts-ignore: Unused class
       
      class MigrateProductFrom3To5 {
        public async changeField5(x: Record<string, any>): Promise<string> {
          return {} as any
        }
      }
    }).to.throw(/No migration methods found in this class/)
  })
})
