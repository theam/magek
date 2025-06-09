import { Effect, Layer } from 'effect'
import { FileSystemService, FileSystemError } from '.'
import * as fs from 'fs'

const readDirectoryContents = (directoryPath: string) =>
  Effect.tryPromise({
    try: () => fs.promises.readdir(directoryPath),
    catch: (reason) =>
      new FileSystemError(new Error(`There were some issues reading the directory ${directoryPath}: ${reason}`))
  })

const readFileContents = (filePath: string) =>
  Effect.tryPromise({
    try: () => fs.promises.readFile(filePath, 'utf8'),
    catch: (reason) => new FileSystemError(new Error(`There were some issues reading the file ${filePath}: ${reason}`))
  })

export const LiveFileSystem = Layer.succeed(FileSystemService, { readDirectoryContents, readFileContents })
