import { Provider } from '../../src/common/provider.js'
import { expect } from '../expect.js'

describe('selectedProvider', (): void => {
  it('get selected provider: Other', async () => {
    expect(Provider.OTHER).to.be.equal('Other')
  })
})
