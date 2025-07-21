import {
  MagekConfig,
  InvalidParameterError,
  NotFoundError,
  QueryEnvelope,
  QueryHandlerGlobalError,
  QueryInfo,
  QueryInput,
  createInstance,
  getLogger,
} from '@magek/common'
import { MagekGlobalErrorDispatcher } from './global-error-dispatcher'
import { GraphQLResolverContext } from './services/graphql/common'
import { applyBeforeFunctions } from './services/filter-helpers'

export class MagekQueryDispatcher {
  private readonly globalErrorDispatcher: MagekGlobalErrorDispatcher

  public constructor(readonly config: MagekConfig) {
    this.globalErrorDispatcher = new MagekGlobalErrorDispatcher(config)
  }

  public async dispatchQuery(queryEnvelope: QueryEnvelope, context: GraphQLResolverContext): Promise<unknown> {
    const logger = getLogger(this.config, 'MagekQueryDispatcher#dispatchQuery')
    logger.debug('Dispatching the following query envelope: ', queryEnvelope)
    if (!queryEnvelope.version) {
      throw new InvalidParameterError('The required query "version" was not present')
    }

    const queryMetadata = this.config.queryHandlers[queryEnvelope.typeName]
    if (!queryMetadata) {
      throw new NotFoundError(`Could not find a proper handler for ${queryEnvelope.typeName}`)
    }

    await queryMetadata.authorizer(queryEnvelope.currentUser, queryEnvelope)

    const queryClass = queryMetadata.class
    logger.debug('Found the following query:', queryClass.name)

    let result: unknown
    try {
      const queryInfo: QueryInfo = {
        requestID: queryEnvelope.requestID,
        responseHeaders: context.responseHeaders,
        currentUser: queryEnvelope.currentUser,
        context: queryEnvelope.context,
      }
      const queryInput: QueryInput = await applyBeforeFunctions(
        queryEnvelope.value,
        queryMetadata.before,
        queryEnvelope.currentUser
      )
      const queryInstance = createInstance(queryClass, queryInput)

      logger.debug('Calling "handle" method on query: ', queryClass)
      result = await queryClass.handle(queryInstance, queryInfo)
    } catch (err) {
      const e = err as Error
      const error = await this.globalErrorDispatcher.dispatch(new QueryHandlerGlobalError(queryEnvelope, e))
      if (error) throw error
    }
    return result
  }
}
