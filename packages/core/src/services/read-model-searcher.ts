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
  const readModelsReader = new MagekReadModelsReader(config)
   
  const searcherFunction: SearcherFunction<TReadModel, any> =
    readModelsReader.readModelSearch.bind(readModelsReader)
  const finderByIdFunction: FinderByKeyFunction<TReadModel> =
    readModelsReader.finderByIdFunction.bind(readModelsReader)
  return new Searcher(readModelClass, searcherFunction, finderByIdFunction)
}
