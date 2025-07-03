import { DecodedToken } from '@booster-ai/common'
import { verifyJWT } from './utilities.js'
import { RoleBasedTokenVerifier } from './role-based-token-verifier.js'

export class PublicKeyTokenVerifier extends RoleBasedTokenVerifier {
  public constructor(readonly issuer: string, readonly publicKeyResolver: Promise<string>, rolesClaim?: string) {
    super(rolesClaim)
  }

  public async verify(token: string): Promise<DecodedToken> {
    const key = await this.publicKeyResolver
    return verifyJWT(token, this.issuer, key)
  }
}
