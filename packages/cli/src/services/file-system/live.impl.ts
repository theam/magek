import { Layer } from 'effect'
import { FileSystemService, FileSystemError } from './index.js'
import * as fs from 'fs'

const readDirectoryContents = async (directoryPath: string): Promise<ReadonlyArray<string>> => {
  try {
    return await fs.promises.readdir(directoryPath)
  } catch (reason) {
    throw new FileSystemError(
      new Error(`There were some issues reading the directory ${directoryPath}: ${reason}`)
    )
  }
}

const readFileContents = async (filePath: string): Promise<string> => {
  try {
    return await fs.promises.readFile(filePath, 'utf8')
  } catch (reason) {
    throw new FileSystemError(new Error(`There were some issues reading the file ${filePath}: ${reason}`))
  }
}

export const LiveFileSystem = Layer.succeed(FileSystemService, { readDirectoryContents, readFileContents })
