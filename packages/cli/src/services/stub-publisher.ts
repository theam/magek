import type { Dirent } from 'fs-extra'
import * as fsExtra from 'fs-extra'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { wrapExecError } from '../common/errors.ts'

const currentDir =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(
        fileURLToPath(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error import.meta is available when running under ESM
          import.meta.url
        )
      )

export type TemplateType =
  | 'command'
  | 'query'
  | 'entity'
  | 'event'
  | 'event-handler'
  | 'read-model'
  | 'scheduled-command'
  | 'type'

export const resourceTemplatesPath: string = join(currentDir, '..', 'templates')

export const resourceStubFilePath = (fileName: string): string => join(process.cwd(), 'stubs', fileName)

export const resourceTemplateFilePath = (fileName: string): string => join(resourceTemplatesPath, fileName)

export const checkStubsFolderExists = (): boolean => fsExtra.existsSync(join(process.cwd(), 'stubs'))

export const checkResourceStubFileExists = (filePath: string): boolean => fsExtra.existsSync(filePath)

export const createStubsFolder = (): void => fsExtra.mkdirSync(join(process.cwd(), 'stubs'))

export const createTemplateFileMap = (files: Dirent[]): Record<string, string> =>
  files
    .filter((file: Dirent) => file.isFile() && file.name.includes('.stub'))
    .reduce((files: Record<string, string>, file: Dirent) => {
      const resourceTemplatePath: string = join(resourceTemplatesPath, file.name)

      files[resourceTemplatePath] = join(process.cwd(), 'stubs', file.name)

      return files
    }, {})

export async function publishStubFiles(): Promise<void> {
  const files: Dirent[] = fsExtra.readdirSync(resourceTemplatesPath, { withFileTypes: true })
  const templateFilesMap = createTemplateFileMap(files)

  try {
    for (const [from, to] of Object.entries(templateFilesMap)) {
      copyStubFile(from, to)
    }
  } catch (e) {
    throw wrapExecError(e, 'Error when publishing stubs')
  }
}

export const copyStubFile = (from: string, to: string): void => fsExtra.writeFileSync(to, fsExtra.readFileSync(from))
