import { expect } from '../expect'

/**
 * Test that @magek/server-infrastructure properly re-exports from @magek/server/infrastructure
 */
describe('@magek/server-infrastructure', () => {
  it('should re-export Infrastructure function', () => {
    const { Infrastructure } = require('@magek/server-infrastructure')
    expect(Infrastructure).to.be.a('function')
  })

  it('should re-export buildFastifyServer function', () => {
    const { buildFastifyServer } = require('@magek/server-infrastructure')
    expect(buildFastifyServer).to.be.a('function')
  })

  it('should re-export WebSocketRegistry class', () => {
    const { WebSocketRegistry } = require('@magek/server-infrastructure')
    expect(WebSocketRegistry).to.exist
  })

  it('should re-export GraphQLController class', () => {
    const { GraphQLController } = require('@magek/server-infrastructure')
    expect(GraphQLController).to.exist
  })

  it('should re-export HealthController class', () => {
    const { HealthController } = require('@magek/server-infrastructure')
    expect(HealthController).to.exist
  })
})
