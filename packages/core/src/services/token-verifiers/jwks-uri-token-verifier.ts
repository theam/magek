import { DecodedToken } from '@magek/common'
import type { GetPublicKeyOrSecret } from 'jsonwebtoken'
import type { JwksClient } from 'jwks-rsa'
import { getJwksClient, getKeyWithClient, verifyJWT } from './utilities'
import { RoleBasedTokenVerifier } from './role-based-token-verifier'

type JwksClientFactory = (jwksUri: string) => JwksClient
type KeyResolverBuilder = (client: JwksClient) => GetPublicKeyOrSecret
type JwtVerifier = (token: string, issuer: string, key: GetPublicKeyOrSecret) => Promise<DecodedToken>

export class JwksUriTokenVerifier extends RoleBasedTokenVerifier {
  private readonly buildClient: JwksClientFactory
  private readonly buildKeyResolver: KeyResolverBuilder
  private readonly verifyToken: JwtVerifier

  public constructor(
    readonly issuer: string,
    readonly jwksUri: string,
    rolesClaim?: string,
    dependencies?: {
      jwksClientFactory?: JwksClientFactory
      keyResolverBuilder?: KeyResolverBuilder
      jwtVerifier?: JwtVerifier
    }
  ) {
    super(rolesClaim)
    this.buildClient = dependencies?.jwksClientFactory ?? getJwksClient
    this.buildKeyResolver =
      dependencies?.keyResolverBuilder ?? ((client) => getKeyWithClient.bind(this, client) as GetPublicKeyOrSecret)
    this.verifyToken = dependencies?.jwtVerifier ?? verifyJWT
  }

  public async verify(token: string): Promise<DecodedToken> {
    const client = this.buildClient(this.jwksUri)
    const keyResolver = this.buildKeyResolver(client)
    return this.verifyToken(token, this.issuer, keyResolver)
  }
}
