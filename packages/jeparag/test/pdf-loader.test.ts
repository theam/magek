import { DocumentLoader } from '../src/loader/pdf-loader'
import { expect } from './helpers/expect'

describe('DocumentLoader Utility', () => {
  it('cleans raw text by normalizing whitespace and control characters', () => {
    const raw = '  Hello \r\n\t world!   This   is   a   test.  '
    const cleaned = DocumentLoader.cleanText(raw)
    expect(cleaned).to.equal('Hello world! This is a test.')
  })

  it('splits text into sliding window chunks with overlap', () => {
    const sampleText = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ')
    const chunks = DocumentLoader.chunkText('doc-1', sampleText, {
      chunkSize: 100,
      chunkOverlap: 20,
    })

    expect(chunks.length).to.be.greaterThan(1)
    expect(chunks[0].id).to.equal('doc-1-chunk-0')
    expect(chunks[0].wordCount).to.equal(100)
    expect(chunks[1].chunkIndex).to.equal(1)
  })
})
