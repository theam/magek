import {
  BoosterConfig,
  Class,
  FinderByKeyFunction,
  ReadModelInterface,
  Searcher,
  SearcherFunction,
} from '@magek/common'
import { BoosterReadModelsReader } from '../read-models-reader'

export function readModelSearcher<TReadModel extends ReadModelInterface>(
  config: BoosterConfig,
  readModelClass: Class<TReadModel>
): Searcher<TReadModel> {
  const boosterReadModelsReader = new BoosterReadModelsReader(config)
   
  const searcherFunction: SearcherFunction<TReadModel, any> =
    boosterReadModelsReader.readModelSearch.bind(boosterReadModelsReader)
  const finderByIdFunction: FinderByKeyFunction<TReadModel> =
    boosterReadModelsReader.finderByIdFunction.bind(boosterReadModelsReader)
  return new Searcher(readModelClass, searcherFunction, finderByIdFunction)
}
