import { DecodedToken } from '@magek/common'
import { getJwksClient, getKeyWithClient, verifyJWT } from './utilities'
import { RoleBasedTokenVerifier } from './role-based-token-verifier'

export class JwksUriTokenVerifier extends RoleBasedTokenVerifier {
  public constructor(readonly issuer: string, readonly jwksUri: string, rolesClaim?: string) {
    super(rolesClaim)
  }

  public async verify(token: string): Promise<DecodedToken> {
    const client = getJwksClient(this.jwksUri)
    const key = getKeyWithClient.bind(this, client)
    return verifyJWT(token, this.issuer, key)
  }
}
