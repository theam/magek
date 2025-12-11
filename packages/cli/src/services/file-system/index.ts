import { Context } from 'effect'

export class FileSystemError {
  readonly _tag = 'FileSystemError'
  public readonly error: Error

  constructor(error: Error) {
    this.error = error
  }
}

export interface FileSystemService {
  readonly readDirectoryContents: (directoryPath: string) => Promise<ReadonlyArray<string>>
  readonly readFileContents: (filePath: string) => Promise<string>
}

export const FileSystemService = Context.GenericTag<FileSystemService>('FileSystemService')
