import { BM25Index } from '../src/retriever/bm25-index'
import { expect } from './helpers/expect'

describe('BM25Index Sparse Engine', () => {
  it('indexes documents and ranks search results by keyword relevance', () => {
    const index = new BM25Index()

    index.addDocument('doc-1', 'Unsecured transfer of patient information via PDA')
    index.addDocument('doc-2', 'Use of generic user names and passwords on computer terminals')
    index.addDocument('doc-3', 'Sign-in sheets that reveal patient names at pharmacy')

    const results = index.search('patient information', 5)

    expect(results).to.have.lengthOf.at.least(1)
    expect(results[0].id).to.equal('doc-1')
    expect(results[0].score).to.be.greaterThan(0)
  })
})
