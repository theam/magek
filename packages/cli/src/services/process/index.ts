export class ProcessError extends Error {
  readonly _tag = 'ProcessError'
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'ProcessError'
  }
}

export interface ProcessService {
  exec(command: string, cwd?: string): Promise<string>
  cwd(): string
}
