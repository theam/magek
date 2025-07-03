import { ReadModelRequestEnvelope, ReadModelInterface } from '@booster-ai/common'
import { ReadModelPubSub } from './read-model-pub-sub.js'

export class NoopReadModelPubSub implements ReadModelPubSub<ReadModelInterface> {
  public async asyncIterator(
    _: ReadModelRequestEnvelope<ReadModelInterface>
  ): Promise<AsyncIterator<ReadModelInterface>> {
    return createAsyncIterator([])
  }
}

function createAsyncIterator<T>(iterable: Iterable<T>): AsyncIterator<T> {
  const iterator = iterable[Symbol.iterator]()
  const asyncIter: any = {
    next(): Promise<IteratorResult<T>> {
      const { value, done } = iterator.next()
      return Promise.resolve({ value, done })
    },
  }
  asyncIter[Symbol.asyncIterator] = () => asyncIter
  return asyncIter as AsyncIterator<T>
}
