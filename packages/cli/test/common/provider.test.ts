import { Provider } from '../../src/common/provider.ts'
import { expect } from '../expect.ts'

describe('selectedProvider', (): void => {
  it('get selected provider: Other', async () => {
    expect(Provider.OTHER).to.be.equal('Other')
  })
})
