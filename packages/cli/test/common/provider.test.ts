import { Provider } from '../../src/common/provider'
import { expect } from '../expect'

describe('selectedProvider', (): void => {
  it('get selected provider: Other', async () => {
    expect(Provider.OTHER).to.be.equal('Other')
  })
})
