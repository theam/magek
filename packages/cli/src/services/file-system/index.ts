export class FileSystemError extends Error {
  readonly _tag = 'FileSystemError'
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'FileSystemError'
  }
}

export interface FileSystemService {
  readDirectoryContents(directoryPath: string): Promise<ReadonlyArray<string>>
  readFileContents(filePath: string): Promise<string>
}
