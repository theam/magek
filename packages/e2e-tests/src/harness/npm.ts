import { writeFile } from 'node:fs/promises'
import * as path from 'node:path'

export interface NpmConfig {
  registryUrl: string
  userConfigPath: string
  env: NodeJS.ProcessEnv
}

const buildAuthLine = (registryUrl: string): string => {
  const url = new URL(registryUrl)
  return `//${url.host}/:_authToken=ci`
}

export const createNpmUserConfig = async (logsRoot: string, registryUrl: string): Promise<string> => {
  const authLine = buildAuthLine(registryUrl)
  const config = [
    `registry=${registryUrl}`,
    authLine,
    'always-auth=false'
  ].join('\n')

  const userConfigPath = path.join(logsRoot, '.npmrc')
  await writeFile(userConfigPath, `${config}\n`, 'utf8')
  return userConfigPath
}

export const buildNpmEnv = (registryUrl: string, userConfigPath: string): NodeJS.ProcessEnv => {
  return {
    ...process.env,
    CI: '1',
    NPM_CONFIG_REGISTRY: registryUrl,
    npm_config_registry: registryUrl,
    PNPM_REGISTRY: registryUrl,
    pnpm_config_registry: registryUrl,
    NPM_CONFIG_USERCONFIG: userConfigPath,
    npm_config_userconfig: userConfigPath
  }
}
