interface JwksClientKey {
  getPublicKey(): string
}

interface JwksClientOptions {
  jwksUri: string
  cache?: boolean
  cacheMaxAge?: number
}

declare module 'jwks-client' {
  export default function jwksClient(options: JwksClientOptions): {
    getSigningKey(kid: string, cb: (err: Error | null, key?: JwksClientKey) => void): void
  }
}