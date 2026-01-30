import { expect } from './expect'
import { MemoryReadModelRegistry } from '../src/memory-read-model-registry'
import { evaluateFilter } from '../src/library/filter-evaluator'
import { ReadModelEnvelope, ReadModelInterface, OptimisticConcurrencyUnexpectedVersionError } from '@magek/common'
import { faker } from '@faker-js/faker'

describe('MemoryReadModelRegistry', () => {
  let registry: MemoryReadModelRegistry

  beforeEach(() => {
    registry = new MemoryReadModelRegistry()
  })

  function createMockReadModel(overrides?: Partial<ReadModelInterface>): ReadModelInterface {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      age: faker.number.int({ min: 18, max: 80 }),
      active: true,
      magekMetadata: {
        version: 1,
        schemaVersion: 1,
      },
      ...overrides,
    }
  }

  function createMockEnvelope(typeName: string, readModel: ReadModelInterface): ReadModelEnvelope {
    return {
      typeName,
      value: readModel,
    }
  }

  describe('store and query', () => {
    it('should store and retrieve a read model', async () => {
      const readModel = createMockReadModel()
      const envelope = createMockEnvelope('User', readModel)

      await registry.store(envelope, 0)

      const results = await registry.query({ typeName: 'User', 'value.id': readModel.id })
      expect(results).to.have.length(1)
      expect(results[0].value.id).to.equal(readModel.id)
    })

    it('should update read model with optimistic concurrency', async () => {
      const readModel = createMockReadModel()
      const envelope = createMockEnvelope('User', readModel)

      await registry.store(envelope, 0)

      // Update with version 2
      const updatedReadModel = { ...readModel, name: 'Updated Name', magekMetadata: { version: 2, schemaVersion: 1 } }
      const updatedEnvelope = createMockEnvelope('User', updatedReadModel)

      await registry.store(updatedEnvelope, 1)

      const results = await registry.query({ typeName: 'User', 'value.id': readModel.id })
      expect(results).to.have.length(1)
      expect(results[0].value.name).to.equal('Updated Name')
    })

    it('should throw on optimistic concurrency conflict', async () => {
      const readModel = createMockReadModel()
      const envelope = createMockEnvelope('User', readModel)

      await registry.store(envelope, 0)

      // Try to update with wrong expected version
      const updatedReadModel = { ...readModel, name: 'Updated Name', magekMetadata: { version: 2, schemaVersion: 1 } }
      const updatedEnvelope = createMockEnvelope('User', updatedReadModel)

      await expect(registry.store(updatedEnvelope, 5)).to.be.rejectedWith(OptimisticConcurrencyUnexpectedVersionError)
    })

    it('should filter by typeName', async () => {
      const user = createMockReadModel()
      const product = createMockReadModel()

      await registry.store(createMockEnvelope('User', user), 0)
      await registry.store(createMockEnvelope('Product', product), 0)

      const results = await registry.query({ typeName: 'User' })
      expect(results).to.have.length(1)
      expect(results[0].typeName).to.equal('User')
    })
  })

  describe('sorting', () => {
    it('should sort results ascending', async () => {
      const user1 = createMockReadModel({ name: 'Zebra' })
      const user2 = createMockReadModel({ name: 'Alpha' })

      await registry.store(createMockEnvelope('User', user1), 0)
      await registry.store(createMockEnvelope('User', user2), 0)

      const results = await registry.query({ typeName: 'User' }, { name: 'ASC' })
      expect(results[0].value.name).to.equal('Alpha')
      expect(results[1].value.name).to.equal('Zebra')
    })

    it('should sort results descending', async () => {
      const user1 = createMockReadModel({ name: 'Alpha' })
      const user2 = createMockReadModel({ name: 'Zebra' })

      await registry.store(createMockEnvelope('User', user1), 0)
      await registry.store(createMockEnvelope('User', user2), 0)

      const results = await registry.query({ typeName: 'User' }, { name: 'DESC' })
      expect(results[0].value.name).to.equal('Zebra')
      expect(results[1].value.name).to.equal('Alpha')
    })
  })

  describe('pagination', () => {
    it('should apply limit', async () => {
      for (let i = 0; i < 5; i++) {
        await registry.store(createMockEnvelope('User', createMockReadModel()), 0)
      }

      const results = await registry.query({ typeName: 'User' }, undefined, 0, 2)
      expect(results).to.have.length(2)
    })

    it('should apply skip', async () => {
      for (let i = 0; i < 5; i++) {
        await registry.store(createMockEnvelope('User', createMockReadModel({ name: `User${i}` })), 0)
      }

      const allResults = await registry.query({ typeName: 'User' }, { name: 'ASC' })
      const skippedResults = await registry.query({ typeName: 'User' }, { name: 'ASC' }, 2)

      expect(skippedResults).to.have.length(3)
      expect(skippedResults[0].value.name).to.equal(allResults[2].value.name)
    })
  })

  describe('field projection', () => {
    it('should select only specified fields', async () => {
      const user = createMockReadModel({ name: 'John', email: 'john@example.com', age: 30 })
      await registry.store(createMockEnvelope('User', user), 0)

      const results = await registry.query({ typeName: 'User' }, undefined, undefined, undefined, ['name', 'id'] as any)

      expect(results[0].value).to.have.property('name')
      expect(results[0].value).to.have.property('id')
      expect(results[0].value).to.not.have.property('email')
      expect(results[0].value).to.not.have.property('age')
    })
  })

  describe('deleteById', () => {
    it('should delete a read model', async () => {
      const user = createMockReadModel()
      await registry.store(createMockEnvelope('User', user), 0)

      const count = await registry.deleteById(user.id, 'User')

      expect(count).to.equal(1)
      expect(registry.getCount()).to.equal(0)
    })

    it('should return 0 when read model not found', async () => {
      const count = await registry.deleteById(faker.string.uuid(), 'User')
      expect(count).to.equal(0)
    })
  })

  describe('count', () => {
    it('should count all read models', async () => {
      await registry.store(createMockEnvelope('User', createMockReadModel()), 0)
      await registry.store(createMockEnvelope('User', createMockReadModel()), 0)
      await registry.store(createMockEnvelope('Product', createMockReadModel()), 0)

      const count = await registry.count()
      expect(count).to.equal(3)
    })

    it('should count filtered read models', async () => {
      await registry.store(createMockEnvelope('User', createMockReadModel()), 0)
      await registry.store(createMockEnvelope('User', createMockReadModel()), 0)
      await registry.store(createMockEnvelope('Product', createMockReadModel()), 0)

      const count = await registry.count({ typeName: 'User' })
      expect(count).to.equal(2)
    })
  })
})

describe('evaluateFilter', () => {
  describe('comparison operators', () => {
    it('should evaluate eq filter', () => {
      expect(evaluateFilter({ name: 'John' }, { name: { eq: 'John' } })).to.be.true
      expect(evaluateFilter({ name: 'Jane' }, { name: { eq: 'John' } })).to.be.false
    })

    it('should evaluate ne filter', () => {
      expect(evaluateFilter({ name: 'Jane' }, { name: { ne: 'John' } })).to.be.true
      expect(evaluateFilter({ name: 'John' }, { name: { ne: 'John' } })).to.be.false
    })

    it('should evaluate lt filter', () => {
      expect(evaluateFilter({ age: 20 }, { age: { lt: 30 } })).to.be.true
      expect(evaluateFilter({ age: 30 }, { age: { lt: 30 } })).to.be.false
    })

    it('should evaluate gt filter', () => {
      expect(evaluateFilter({ age: 40 }, { age: { gt: 30 } })).to.be.true
      expect(evaluateFilter({ age: 30 }, { age: { gt: 30 } })).to.be.false
    })

    it('should evaluate lte filter', () => {
      expect(evaluateFilter({ age: 30 }, { age: { lte: 30 } })).to.be.true
      expect(evaluateFilter({ age: 31 }, { age: { lte: 30 } })).to.be.false
    })

    it('should evaluate gte filter', () => {
      expect(evaluateFilter({ age: 30 }, { age: { gte: 30 } })).to.be.true
      expect(evaluateFilter({ age: 29 }, { age: { gte: 30 } })).to.be.false
    })
  })

  describe('collection operators', () => {
    it('should evaluate in filter', () => {
      expect(evaluateFilter({ status: 'active' }, { status: { in: ['active', 'pending'] } })).to.be.true
      expect(evaluateFilter({ status: 'closed' }, { status: { in: ['active', 'pending'] } })).to.be.false
    })
  })

  describe('existence operators', () => {
    it('should evaluate isDefined filter', () => {
      expect(evaluateFilter({ name: 'John' }, { name: { isDefined: true } })).to.be.true
      expect(evaluateFilter({ name: undefined }, { name: { isDefined: true } })).to.be.false
      expect(evaluateFilter({ name: undefined }, { name: { isDefined: false } })).to.be.true
    })
  })

  describe('string operators', () => {
    it('should evaluate contains filter', () => {
      expect(evaluateFilter({ email: 'john@example.com' }, { email: { contains: 'example' } })).to.be.true
      expect(evaluateFilter({ email: 'john@test.com' }, { email: { contains: 'example' } })).to.be.false
    })

    it('should evaluate beginsWith filter', () => {
      expect(evaluateFilter({ name: 'John Doe' }, { name: { beginsWith: 'John' } })).to.be.true
      expect(evaluateFilter({ name: 'Jane Doe' }, { name: { beginsWith: 'John' } })).to.be.false
    })

    it('should evaluate regex filter', () => {
      expect(evaluateFilter({ email: 'john@example.com' }, { email: { regex: '^john@' } })).to.be.true
      expect(evaluateFilter({ email: 'jane@example.com' }, { email: { regex: '^john@' } })).to.be.false
    })

    it('should evaluate iRegex filter (case insensitive)', () => {
      expect(evaluateFilter({ name: 'JOHN' }, { name: { iRegex: 'john' } })).to.be.true
    })
  })

  describe('array operators', () => {
    it('should evaluate includes filter with string', () => {
      expect(evaluateFilter({ tags: ['javascript', 'typescript'] }, { tags: { includes: 'script' } })).to.be.true
    })
  })

  describe('logical operators', () => {
    it('should evaluate and filter', () => {
      const value = { name: 'John', age: 30 }
      expect(evaluateFilter(value, { and: [{ name: { eq: 'John' } }, { age: { gte: 25 } }] })).to.be.true
      expect(evaluateFilter(value, { and: [{ name: { eq: 'John' } }, { age: { gte: 35 } }] })).to.be.false
    })

    it('should evaluate or filter', () => {
      const value = { name: 'John', age: 20 }
      expect(evaluateFilter(value, { or: [{ name: { eq: 'Jane' } }, { age: { lt: 25 } }] })).to.be.true
      expect(evaluateFilter(value, { or: [{ name: { eq: 'Jane' } }, { age: { gt: 25 } }] })).to.be.false
    })

    it('should evaluate not filter', () => {
      const value = { status: 'active' }
      expect(evaluateFilter(value, { not: { status: { eq: 'deleted' } } })).to.be.true
      expect(evaluateFilter(value, { not: { status: { eq: 'active' } } })).to.be.false
    })
  })

  describe('nested fields', () => {
    it('should access nested field values', () => {
      const value = { address: { city: 'New York', country: 'USA' } }
      expect(evaluateFilter(value, { address: { city: { eq: 'New York' } } })).to.be.true
      expect(evaluateFilter(value, { address: { city: { eq: 'Boston' } } })).to.be.false
    })
  })
})
