import { expect } from '../../expect'
import { PublicKeyTokenVerifier } from '../../../src/services/token-verifiers/public-key-token-verifier'
import { fake, restore } from 'sinon'

describe('PublicKeyTokenVerifier', () => {
  afterEach(() => {
    restore()
  })

  it('resolves the public key and calls `verifyJWT`', async () => {
    const fakeDecodedToken = { header: { kid: '123' }, payload: { sub: '123' } }
    const fakeVerifyJWT = fake.resolves(fakeDecodedToken)

    const publicKey = 'public key'
    const publicKeyResolver = Promise.resolve(publicKey)
    const verifier = new PublicKeyTokenVerifier('https://example.com/jwks', publicKeyResolver, undefined, {
      jwtVerifier: fakeVerifyJWT,
    })

    await expect(verifier.verify('token')).to.eventually.become(fakeDecodedToken)
    expect(fakeVerifyJWT).to.have.been.calledWith('token', 'https://example.com/jwks', publicKey)
  })
})
