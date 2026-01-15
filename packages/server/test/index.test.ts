import { expect } from './expect'
import { createServer, ServerRuntime } from '../src'

describe('server package', () => {
  it('exposes createServer function', () => {
    expect(createServer).to.be.a('function')
  })

  it('exposes ServerRuntime', () => {
    expect(ServerRuntime).to.be.an('object')
  })

  it('ServerRuntime exposes runtime libraries', () => {
    expect(ServerRuntime.graphQL).to.exist
    expect(ServerRuntime.api).to.exist
    expect(ServerRuntime.messaging).to.exist
    expect(ServerRuntime.scheduled).to.exist
    expect(ServerRuntime.sensor).to.exist
  })
})
