import { DecodedToken } from '@magek/common'
import { getJwksClient, getKeyWithClient, verifyJWT } from './utilities'
import { RoleBasedTokenVerifier } from './role-based-token-verifier'

/**
 * Environment variables that are used to configure a default JWKs URI Token Verifier
 *
 * @deprecated [EOL v3] Explicitly initialize the JWKs URI Token Verifier in the project config.
 */
export const JWT_ENV_VARS = {
  JWT_ISSUER: 'JWT_ISSUER',
  JWKS_URI: 'JWKS_URI',
  ROLES_CLAIM: 'ROLES_CLAIM',
}

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
