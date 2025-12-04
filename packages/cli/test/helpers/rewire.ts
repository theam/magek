import { createRequire } from 'module'
import * as path from 'path'

const requireFn = typeof require === 'function' ? require : createRequire(process.cwd() + '/')
const baseRewire: (target: string) => unknown = requireFn('rewire')

export type RewiredModule = {
  __get__: <T = unknown>(key: string) => T
  __set__: (key: string, value: unknown) => () => void
}

export const rewire = <T = RewiredModule>(target: string): T => {
  const absolutePath = path.isAbsolute(target) ? target : path.join(process.cwd(), target)
  return baseRewire(absolutePath) as T
}
