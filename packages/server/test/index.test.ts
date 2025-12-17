import { expect } from './expect'
import { Infrastructure, Provider } from '../src'

describe('server Provider infrastructure', () => {
  it('exposes Infrastructure builder', () => {
    expect(Infrastructure).to.be.a('function')
  })

  it('returns infrastructure from local builder', () => {
    const infrastructure = Provider().infrastructure()
    expect(infrastructure.start).to.be.a('function')
  })
})
