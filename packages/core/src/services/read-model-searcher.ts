import {
  BoosterConfig,
  Class,
  ReadModelInterface,
  Searcher,
  SearcherFunction,
} from '@booster-ai/common'
import { BoosterReadModelsReader } from '../booster-read-models-reader'

export function readModelSearcher<TReadModel extends ReadModelInterface>(
  config: BoosterConfig,
  readModelClass: Class<TReadModel>
): Searcher<TReadModel> {
  const boosterReadModelsReader = new BoosterReadModelsReader(config)
   
  const searcherFunction: SearcherFunction<TReadModel, any> =
    boosterReadModelsReader.readModelSearch.bind(boosterReadModelsReader)
  return new Searcher(readModelClass, searcherFunction)
}
