import { Config, run as oclifRun } from '@oclif/core'
import { registerMagekCliPlugins } from './plugin-loader.js'

type ConfigLoadOptions = Parameters<typeof Config.load>[0]

export const run = async (argv?: string[], options?: ConfigLoadOptions): Promise<unknown> => {
  const config = await Config.load(options)
  await registerMagekCliPlugins(config, config.root ?? process.cwd())
  return oclifRun(argv, config)
}
