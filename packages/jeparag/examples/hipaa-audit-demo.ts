/**
 * Full Executable Demonstration of @magek/jeparag
 *
 * Demonstrates HIPAA Privacy Audit using Magek Ambient Agents,
 * BM25 Sparse Search, JEPA Dense Vector Search, and Reciprocal Rank Fusion (RRF).
 */

import {
  DocumentIngestedEvent,
  JeparagAmbientAgent,
  JeparagHybridSearchReadModel,
} from '../src/index'

async function runDemo(): Promise<void> {
  console.log('===============================================================')
  console.log('🤖 @magek/jeparag: HIPAA Privacy Compliance Audit Demo')
  console.log('===============================================================\n')

  // 1. Initialize Magek Ambient Agent
  const agent = new JeparagAmbientAgent('hash')
  JeparagHybridSearchReadModel.clear()

  // 2. Sample HIPAA Regulations Document Corpus (14 Violations)
  const hipaaDocumentText = `
    HIPAA Privacy and Security Standards - Common Administrative and Technical Violations:
    
    1. Sign-in sheets that reveal individuals who have received prescriptions at your pharmacy.
    2. Unsecured transfer of information from a PDA to another database using a wireless connection.
    3. A PDA device that does not use a locking system on patient-related information.
    4. Discussion about a particular patient in a public area regardless of whether the patient's name is mentioned.
    5. Computer monitors that can be seen by unauthorized personnel.
    6. Use of generic user names and passwords across clinical workstations.
    7. Computer terminals that cannot be locked when not in use.
    8. Access to computer records that are not automatically terminated after a period of idle time.
    9. Printer or fax outputs containing sensitive patient records that can be seen by unauthorized personnel.
    10. Lack of an audit trail on who has had access to patient information.
    11. Printed material with patient-related information that is not shredded or destroyed prior to disposal.
    12. Group e-mail to patients on upcoming events where recipients can see other recipients' addresses.
    13. Individual utilization of patient information or addresses sent to pharmaceutical or marketing firms.
    14. Discussion of work events that includes specific information about a patient with unauthorized individuals.
  `

  console.log('📄 Step 1: Ingesting HIPAA Document into Magek Event Stream...')
  const ingestEvent = new DocumentIngestedEvent(
    'hipaa-doc-2026',
    'HIPAA Compliance Audit Manual',
    hipaaDocumentText
  )

  const embeddedEvents = await agent.onDocumentIngested(ingestEvent)
  console.log(`✅ Document successfully chunked and projected into ReadModel (${embeddedEvents.length} chunks generated).\n`)

  // 3. Process RAG Query via JeparagAmbientAgent
  const searchQuery = 'give me several examples of HIPAA privacy violations'
  console.log(`🔍 Step 2: Agent executing Hybrid RRF Query: "${searchQuery}"...`)

  const queryEvent = await agent.processQuery('q-audit-101', searchQuery, 5)

  console.log('\n📊 Step 3: RAG Retrieval Results & Synthesis:')
  console.log('---------------------------------------------------------------')
  console.log(`Query ID: ${queryEvent.queryId}`)
  console.log(`Retrieved Chunks: ${queryEvent.retrievedChunkIds.join(', ')}`)
  console.log('\n--- Generated Response ---')
  console.log(queryEvent.answer)
  console.log('---------------------------------------------------------------\n')
  console.log('✨ Demo Completed Successfully!')
}

runDemo().catch((err) => {
  console.error('❌ Demo execution failed:', err)
  process.exit(1)
})
