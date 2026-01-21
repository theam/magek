import { run as oclifRun } from '@oclif/core'
export { COMMANDS } from './commands/index.js'

export const run = async (argv?: string[]): Promise<unknown> => {
  return oclifRun(argv)
}
