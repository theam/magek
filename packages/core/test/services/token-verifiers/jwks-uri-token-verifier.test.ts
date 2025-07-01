import { expect } from '../../expect'
import { JwksUriTokenVerifier } from '../../../src/services/token-verifiers/jwks-uri-token-verifier'
import * as utilities from '../../../src/services/token-verifiers/utilities'
import { fake, match, replace, restore } from 'sinon'

describe('JwksUriTokenVerifier', () => {
  afterEach(() => {
    restore()
  })

  it('builds a key resolver and calls `verifyJWT`', async () => {
    const fakeClient = {
      getKeys: fake(),
      getSigningKeys: fake(),
      getSigningKey: fake()
    }
    replace(utilities, 'getJwksClient', fake.returns(fakeClient))
    const fakeDecodedToken = { header: { kid: '123' }, payload: { sub: '123' } }
    const fakeVerifyJWT = fake.resolves(fakeDecodedToken)
    replace(utilities, 'verifyJWT', fakeVerifyJWT)

    const verifier = new JwksUriTokenVerifier('issuer', 'https://example.com/jwks')

    await expect(verifier.verify('token')).to.eventually.become(fakeDecodedToken)
    expect(utilities.getJwksClient).to.have.been.calledWith('https://example.com/jwks')
    expect(utilities.verifyJWT).to.have.been.calledWith('token', 'issuer', match.func)
  })
})
