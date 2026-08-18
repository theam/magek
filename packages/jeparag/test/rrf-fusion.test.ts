import { ReciprocalRankFusion } from '../src/retriever/rrf-fusion'
import { expect } from './helpers/expect'

describe('ReciprocalRankFusion (RRF)', () => {
  it('combines dense and sparse rank results into fused RRF scores', () => {
    const rrf = new ReciprocalRankFusion(60)

    const denseResults = [
      { id: 'doc-A', score: 0.95 },
      { id: 'doc-B', score: 0.85 },
    ]

    const sparseResults = [
      { id: 'doc-B', score: 12.5 },
      { id: 'doc-C', score: 8.0 },
    ]

    const fused = rrf.fuse(denseResults, sparseResults, 5)

    expect(fused).to.have.lengthOf(3)
    // doc-B is rank 2 in dense and rank 1 in sparse, so it accumulates both ranks
    expect(fused[0].id).to.equal('doc-B')
    expect(fused[0].rrfScore).to.be.greaterThan(0)
  })
})
