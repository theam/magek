import { LocalQueries } from './local-queries'

interface ApplicationOutputs {
  graphqlURL: string
  websocketURL: string
  healthURL: string
}

export class LocalTestHelper {
  private constructor(
    readonly outputs: ApplicationOutputs,
    readonly queries: LocalQueries
  ) {}

  public static async build(appName: string): Promise<LocalTestHelper> {
    await this.ensureProviderIsReady()
    return new LocalTestHelper(
      {
        graphqlURL: await this.graphqlURL(),
        websocketURL: await this.websocketURL(),
        healthURL: await this.healthURL(),
      },
      new LocalQueries()
    )
  }

  private static async ensureProviderIsReady(): Promise<void> {
    const url = await this.healthURL()
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Provider is not ready: ${response.status} ${response.statusText}`)
    }
  }

  private static async graphqlURL(): Promise<string> {
    const url = 'http://localhost:3000/graphql'
    return url
  }

  private static async healthURL(): Promise<string> {
    return 'http://localhost:3000/sensor/health/'
  }

  private static async websocketURL(): Promise<string> {
    const url = 'ws://localhost:65529/websocket'
    return url
  }
}
