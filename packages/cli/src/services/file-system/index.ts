import { Effect, Context } from 'effect'

export class FileSystemError {
  readonly _tag = 'FileSystemError'
  public readonly error: Error

  constructor(error: Error) {
    this.error = error
  }
}

export interface FileSystemService {
  readonly readDirectoryContents: (directoryPath: string) => Effect.Effect<ReadonlyArray<string>, FileSystemError>
  readonly readFileContents: (filePath: string) => Effect.Effect<string, FileSystemError>
}

export const FileSystemService = Context.GenericTag<FileSystemService>('FileSystemService')
