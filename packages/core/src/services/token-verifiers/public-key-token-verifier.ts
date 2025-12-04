import { DecodedToken } from '@magek/common'
import { verifyJWT } from './utilities'
import { RoleBasedTokenVerifier } from './role-based-token-verifier'

type JwtVerifier = (token: string, issuer: string, key: string) => Promise<DecodedToken>

export class PublicKeyTokenVerifier extends RoleBasedTokenVerifier {
  private readonly verifyToken: JwtVerifier

  public constructor(
    readonly issuer: string,
    readonly publicKeyResolver: Promise<string>,
    rolesClaim?: string,
    dependencies?: { jwtVerifier?: JwtVerifier }
  ) {
    super(rolesClaim)
    this.verifyToken = dependencies?.jwtVerifier ?? verifyJWT
  }

  public async verify(token: string): Promise<DecodedToken> {
    const key = await this.publicKeyResolver
    return this.verifyToken(token, this.issuer, key)
  }
}
