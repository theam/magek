import * as path from 'path'
import * as process from 'process'
import { MagekConfig, getLogger } from '@magek/common'

export function boosterVersion(config: MagekConfig) {
  const projectAbsolutePath = path.resolve(process.cwd())
  const logger = getLogger(config, 'boosterVersion')
  try {
    const packageJsonContents = require(path.join(projectAbsolutePath, 'package.json'))
    const version = packageJsonContents.dependencies['@magek/core']
    if (!version) {
      logger.warn('Could not get Magek Version')
      return ''
    }
    const versionParts = version.replace('workspace:', '').replace('^', '').replace('.tgz', '').split('-')
    return versionParts[versionParts.length - 1]
  } catch (e) {
    logger.warn('There was an error when calculating the booster version the application', e)
    return ''
  }
}
