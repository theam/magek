import * as path from 'path'

export const readModelsDatabase = internalPath('read_models.json')

function internalPath(filename: string): string {
  return path.normalize(path.join('.', '.magek', filename))
}