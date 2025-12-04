import { expect } from '../../expect'
import { JwksUriTokenVerifier } from '../../../src/services/token-verifiers/jwks-uri-token-verifier'
import { fake, match, restore } from 'sinon'
import type { GetPublicKeyOrSecret } from 'jsonwebtoken'
import type { JwksClient } from 'jwks-rsa'

describe('JwksUriTokenVerifier', () => {
  afterEach(() => {
    restore()
  })

  it('builds a key resolver and calls `verifyJWT`', async () => {
    const fakeClient = {
      getKeys: fake(),
      getSigningKeys: fake(),
      getSigningKey: fake(),
    } as unknown as JwksClient
    const fakeClientFactory = fake.returns(fakeClient)
    const fakeKeyResolver: GetPublicKeyOrSecret = fake()
    const fakeKeyResolverBuilder = fake.returns(fakeKeyResolver)
    const fakeDecodedToken = { header: { kid: '123' }, payload: { sub: '123' } }
    const fakeVerifyJWT = fake.resolves(fakeDecodedToken)

    const verifier = new JwksUriTokenVerifier('issuer', 'https://example.com/jwks', undefined, {
      jwksClientFactory: fakeClientFactory,
      keyResolverBuilder: fakeKeyResolverBuilder,
      jwtVerifier: fakeVerifyJWT,
    })

    await expect(verifier.verify('token')).to.eventually.become(fakeDecodedToken)
    expect(fakeClientFactory).to.have.been.calledWith('https://example.com/jwks')
    expect(fakeKeyResolverBuilder).to.have.been.calledWith(fakeClient)
    expect(fakeVerifyJWT).to.have.been.calledWith('token', 'issuer', match.same(fakeKeyResolver))
  })
})
