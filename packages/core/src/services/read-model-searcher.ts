import {
  MagekConfig,
  Class,
  FinderByKeyFunction,
  ReadModelInterface,
  Searcher,
  SearcherFunction,
} from '@magek/common'
import { MagekReadModelsReader } from '../read-models-reader'

export function readModelSearcher<TReadModel extends ReadModelInterface>(
  config: MagekConfig,
  readModelClass: Class<TReadModel>
): Searcher<TReadModel> {
  const boosterReadModelsReader = new MagekReadModelsReader(config)
   
  const searcherFunction: SearcherFunction<TReadModel, any> =
    boosterReadModelsReader.readModelSearch.bind(boosterReadModelsReader)
  const finderByIdFunction: FinderByKeyFunction<TReadModel> =
    boosterReadModelsReader.finderByIdFunction.bind(boosterReadModelsReader)
  return new Searcher(readModelClass, searcherFunction, finderByIdFunction)
}
