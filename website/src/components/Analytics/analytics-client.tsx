import * as Fathom from 'fathom-client'

export class AnalyticsClient {
  static start() {
    Fathom.load('LHRTIPFZ', { url: 'https://tl1.magek.ai/script.js' })
  }

  static trackEvent(event: string) {
    Fathom.trackGoal(event, 0)
  }

  static startAndTrackEvent(event: string) {
    this.start()
    this.trackEvent(event)
  }
}
