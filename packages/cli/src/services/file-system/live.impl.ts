import { FileSystemService, FileSystemError } from './index.js'
import * as fs from 'fs'

export const createFileSystemService = (): FileSystemService => ({
  readDirectoryContents: async (directoryPath: string): Promise<ReadonlyArray<string>> => {
    try {
      return await fs.promises.readdir(directoryPath)
    } catch (reason: unknown) {
      throw new FileSystemError(
        `There were some issues reading the directory ${directoryPath}`,
        reason instanceof Error ? reason : new Error(String(reason))
      )
    }
  },
  readFileContents: async (filePath: string): Promise<string> => {
    try {
      return await fs.promises.readFile(filePath, 'utf8')
    } catch (reason: unknown) {
      throw new FileSystemError(
        `There were some issues reading the file ${filePath}`,
        reason instanceof Error ? reason : new Error(String(reason))
      )
    }
  },
})

export const liveFileSystemService = createFileSystemService()
