import * as path from 'path'
import * as fsExtra from 'fs-extra'
import * as Mustache from 'mustache'
import type { Target, FileDir } from './generator/target/index.ts'
import { classNameToFileName, checkResourceNameIsValid } from '../common/filenames.ts'
import { checkResourceExists } from './project-checker.ts'
import {
  checkResourceStubFileExists,
  resourceStubFilePath,
  checkStubsFolderExists,
  resourceTemplateFilePath,
} from './stub-publisher.ts'
import type { TemplateType } from './stub-publisher.ts'

export async function generate<TInfo>(target: Target<TInfo>): Promise<void> {
  await checkResourceExists(target.name, target.placementDir, target.extension)
  checkResourceNameIsValid(target.name)
  const rendered = Mustache.render(target.template, { ...target.info })
  const renderPath = filePath<TInfo>(target)
  await fsExtra.outputFile(renderPath, rendered)
}

export function template(name: TemplateType): string {
  const fileName = `${name}.stub`
  const stubFile = resourceStubFilePath(fileName)

  if (checkStubsFolderExists() && checkResourceStubFileExists(stubFile)) {
    return fsExtra.readFileSync(stubFile).toString()
  }

  return fsExtra.readFileSync(resourceTemplateFilePath(fileName)).toString()
}

export function filePath<TInfo>(target: FileDir<TInfo>): string {
  const fileName = classNameToFileName(target.name)
  return path.join(process.cwd(), target.placementDir, `${fileName}${target.extension}`)
}

/**
 * Split path string to get resource folder name
 *
 * @param resourcePath path string
 */
export function getResourceType(resourcePath: string): string {
  return path.parse(resourcePath).name
}
