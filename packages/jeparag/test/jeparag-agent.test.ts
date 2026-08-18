import { JeparagAmbientAgent } from '../src/agent/jeparag-agent'
import { DocumentIngestedEvent } from '../src/concepts/events'
import { JeparagHybridSearchReadModel } from '../src/concepts/read-model'
import { expect } from './helpers/expect'

describe('JeparagAmbientAgent', () => {
  beforeEach(() => {
    JeparagHybridSearchReadModel.clear()
  })

  it('processes document ingestion events and performs contextual hybrid RAG queries', async () => {
    const agent = new JeparagAmbientAgent('hash')

    const documentText = `
      HIPAA Compliance Rules and Violations:
      1. Sign-in sheets that reveal patient names at pharmacy.
      2. Computer terminals that cannot be locked when not in use.
      3. Discussion about a particular patient in a public area.
    `

    const ingestEvent = new DocumentIngestedEvent(
      'hipaa-doc-1',
      'HIPAA Regulations',
      documentText
    )

    const embeddedEvents = await agent.onDocumentIngested(ingestEvent)
    expect(embeddedEvents).to.have.lengthOf.at.least(1)

    const queryEvent = await agent.processQuery('q-1', 'patient sign-in sheet violations', 5)

    expect(queryEvent.queryId).to.equal('q-1')
    expect(queryEvent.answer).to.include('[Jeparag RAG Answer]')
    expect(queryEvent.retrievedChunkIds).to.have.lengthOf.at.least(1)
  })
})
