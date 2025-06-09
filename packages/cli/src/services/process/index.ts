import { Effect, Context } from 'effect'

export class ProcessError {
  readonly _tag = 'ProcessError'
  constructor(readonly error: Error) {}
}

export interface ProcessService {
  readonly exec: (command: string, cwd?: string) => Effect.Effect<string, ProcessError>
  readonly cwd: () => Effect.Effect<string, ProcessError>
}

export const ProcessService = Context.GenericTag<ProcessService>('ProcessService')
