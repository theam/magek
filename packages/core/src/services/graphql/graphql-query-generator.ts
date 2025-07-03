import { AnyClass, BoosterConfig } from '@booster-ai/common'
import { GraphQLFieldResolver, GraphQLInputObjectType, GraphQLObjectType } from 'graphql'
import { GraphQLResolverContext, ResolverBuilder, TargetTypesMap } from './common.js'
import { GraphQLTypeInformer } from './graphql-type-informer.js'
import { GraphqlQueryEventsGenerator } from './query-generators/graphql-query-events-generator.js'
import { GraphqlQueryByKeysGenerator } from './query-generators/graphql-query-by-keys-generator.js'
import { GraphqlQueryFiltersGenerator } from './query-generators/graphql-query-filters-generator.js'
import { GraphqlQueryListedGenerator } from './query-generators/graphql-query-listed-generator.js'
import { GraphqlQueryGenerator } from './query-generators/graphql-query-generator.js'

export class GraphQLQueryGenerator {
  private graphqlQueryByKeysGenerator: GraphqlQueryByKeysGenerator
  private graphqlQueryGenerator: GraphqlQueryGenerator
  private graphqlQueryFiltersGenerator: GraphqlQueryFiltersGenerator
  private graphqlQueryListedGenerator: GraphqlQueryListedGenerator
  private graphqlQueryEventsGenerator: GraphqlQueryEventsGenerator

  public constructor(
    protected readonly config: BoosterConfig,
    protected readonly readModels: AnyClass[],
    protected readonly targetTypes: TargetTypesMap,
    protected readonly typeInformer: GraphQLTypeInformer,
    protected readonly byIDResolverBuilder: ResolverBuilder,
    protected readonly queryResolverBuilder: ResolverBuilder,
    protected readonly filterResolverBuilder: ResolverBuilder,
    protected readonly eventsResolver: GraphQLFieldResolver<unknown, GraphQLResolverContext, any>,
    protected generatedFiltersByTypeName: Record<string, GraphQLInputObjectType> = {}
  ) {
    this.graphqlQueryByKeysGenerator = new GraphqlQueryByKeysGenerator(
      config,
      readModels,
      typeInformer,
      byIDResolverBuilder
    )
    this.graphqlQueryGenerator = new GraphqlQueryGenerator(targetTypes, typeInformer, queryResolverBuilder, config)
    this.graphqlQueryFiltersGenerator = new GraphqlQueryFiltersGenerator(
      readModels,
      typeInformer,
      filterResolverBuilder,
      generatedFiltersByTypeName,
      config
    )
    this.graphqlQueryListedGenerator = new GraphqlQueryListedGenerator(
      readModels,
      typeInformer,
      filterResolverBuilder,
      generatedFiltersByTypeName,
      config
    )
    this.graphqlQueryEventsGenerator = new GraphqlQueryEventsGenerator(config, byIDResolverBuilder, eventsResolver)
  }

  public generate(): GraphQLObjectType {
    const byIDQueries = this.graphqlQueryByKeysGenerator.generateByKeysQueries()
    const queries = this.graphqlQueryGenerator.generateQueries()
    const filterQueries = this.graphqlQueryFiltersGenerator.generateFilterQueries()
    const listedQueries = this.graphqlQueryListedGenerator.generateListedQueries()
    const eventQueries = this.graphqlQueryEventsGenerator.generateEventQueries()
    return new GraphQLObjectType({
      name: 'Query',
      fields: { ...byIDQueries, ...filterQueries, ...listedQueries, ...eventQueries, ...queries },
    })
  }
}
