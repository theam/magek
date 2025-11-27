import {
  IndentationText,
  MethodDeclarationStructure,
  OptionalKind,
  Project,
  QuoteKind,
  Scope,
  SourceFile,
} from 'ts-morph'
import { Projection, ReactionEvent } from './generator/target/index.ts'
import { fileNameWithExtension } from '../common/filenames.ts'

const getResourceSourceFileImpl = (name: string): SourceFile => {
  const project = new Project({
    tsConfigFilePath: './tsconfig.json',
    manipulationSettings: {
      quoteKind: QuoteKind.Single,
      indentationText: IndentationText.TwoSpaces,
    },
  })

  const sourceFileName = fileNameWithExtension(name)
  return project.getSourceFileOrThrow(sourceFileName)
}

const generateReducersImpl = (
  entity: string,
  events: ReactionEvent[]
): OptionalKind<MethodDeclarationStructure>[] => {
  return events.map(({ eventName }) => {
    return {
      decorators: [
        {
          name: 'Reduces',
          arguments: [eventName],
        },
      ],
      scope: Scope.Public,
      isStatic: true,
      name: `reduce${eventName}`,
      returnType: entity,
      parameters: [
        {
          name: 'event',
          type: eventName,
        },
        {
          name: `current${entity}`,
          type: entity,
          hasQuestionToken: true,
        },
      ],
      statements: [`return /* NEW ${entity} HERE */`],
    }
  })
}

const generateProjectionImpl = (readModel: string, projection: Projection): OptionalKind<MethodDeclarationStructure> => {
  return {
    decorators: [
      {
        name: 'Projects',
        arguments: [projection.entityName, `'${projection.entityId}'`],
      },
    ],
    scope: Scope.Public,
    isStatic: true,
    name: `project${projection.entityName}`,
    parameters: [
      {
        name: 'entity',
        type: projection.entityName,
      },
      {
        name: `current${readModel}`,
        type: readModel,
        hasQuestionToken: true,
      },
    ],
    returnType: `ProjectionResult<${readModel}>`,
    statements: [`return /* NEW ${readModel} HERE */`],
  }
}

export const methodGenerator = {
  getResourceSourceFile: getResourceSourceFileImpl,
  generateReducers: generateReducersImpl,
  generateProjection: generateProjectionImpl,
}

export const getResourceSourceFile = (...args: Parameters<typeof getResourceSourceFileImpl>) =>
  methodGenerator.getResourceSourceFile(...args)

export const generateReducers = (...args: Parameters<typeof generateReducersImpl>) =>
  methodGenerator.generateReducers(...args)

export const generateProjection = (...args: Parameters<typeof generateProjectionImpl>) =>
  methodGenerator.generateProjection(...args)
