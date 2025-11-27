import * as inflected from 'inflected'

const classNameToFileNameImpl = (name: string): string => inflected.dasherize(inflected.underscore(name))

const fileNameWithExtensionImpl = (name: string, extension = 'ts'): string =>
  (classNameToFileNameImpl(name) + '.' + extension).toLowerCase()

const checkResourceNameIsValidImpl = (name: string): void => {
  if (!hasValidResourceName(name))
    throw new Error(`'${name}' is not valid resource name. Please use PascalCase name with valid characters.`)
}

function hasValidResourceName(name: string): boolean {
  const resourceName = formatResourceName(name)
  return resourceName === name
}

export function formatResourceName(name: string): null | string {
  const resourceName: string = name
    .replace(/^[\d-]|[#$-/:-?{-~!"^_`[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (resourceName === '') return null

  if (resourceName.length === 1) return resourceName.toLocaleUpperCase()

  const match = resourceName.match(/[a-zA-Z\d]+/g)

  if (match) return match.map(titleCaseString).join('')

  return resourceName
}

export const titleCaseString = (value: string): string => value[0].toLocaleUpperCase() + value.slice(1)

export const filenames = {
  classNameToFileName: classNameToFileNameImpl,
  fileNameWithExtension: fileNameWithExtensionImpl,
  checkResourceNameIsValid: checkResourceNameIsValidImpl,
  formatResourceName,
  titleCaseString,
}

export const classNameToFileName = (...args: Parameters<typeof classNameToFileNameImpl>) =>
  filenames.classNameToFileName(...args)

export const fileNameWithExtension = (...args: Parameters<typeof fileNameWithExtensionImpl>) =>
  filenames.fileNameWithExtension(...args)

export const checkResourceNameIsValid = (...args: Parameters<typeof checkResourceNameIsValidImpl>) =>
  filenames.checkResourceNameIsValid(...args)
