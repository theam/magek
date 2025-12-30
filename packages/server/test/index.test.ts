import { expect } from './expect'
import { createServer, Provider } from '../src'

describe('server package', () => {
  it('exposes createServer function', () => {
    expect(createServer).to.be.a('function')
  })

  it('exposes Provider function', () => {
    expect(Provider).to.be.a('function')
  })

  it('Provider returns ProviderLibrary', () => {
    const provider = Provider()
    expect(provider.graphQL).to.exist
    expect(provider.api).to.exist
    expect(provider.messaging).to.exist
    expect(provider.scheduled).to.exist
    expect(provider.sensor).to.exist
  })
})
