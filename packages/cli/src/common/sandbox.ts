import * as fs from 'fs'
import * as fsExtra from 'fs-extra'
import * as path from 'path'

const copyFolder = (origin: string, destiny: string): void => {
  fs.readdirSync(origin, { withFileTypes: true }).forEach((dirEnt) => {
    if (dirEnt.isFile()) {
      fsExtra.copySync(path.join(origin, dirEnt.name), path.join(destiny, dirEnt.name))
    }
    if (dirEnt.isDirectory()) {
      fs.mkdirSync(path.join(destiny, dirEnt.name), { recursive: true })
      copyFolder(path.join(origin, dirEnt.name), path.join(destiny, dirEnt.name))
    }
  })
}

export const createSandboxProject = (sandboxPath: string, assets?: Array<string>): string => {
  fs.rmSync(sandboxPath, { recursive: true, force: true })
  fs.mkdirSync(sandboxPath, { recursive: true })
  copyFolder('src', path.join(sandboxPath, 'src'))

  const projectFiles = ['package.json', 'package-lock.json', 'tsconfig.json']
  projectFiles.forEach((file: string) => {
    if (fsExtra.existsSync(file)) {
      fsExtra.copySync(file, path.join(sandboxPath, file))
    }
  })

  if (assets) {
    assets.forEach((asset) => {
      if (fs.statSync(asset).isDirectory()) {
        copyFolder(asset, path.join(sandboxPath, asset))
      } else {
        fsExtra.copySync(asset, path.join(sandboxPath, asset))
      }
    })
  }

  return sandboxPath
}

export const removeSandboxProject = (sandboxPath: string): void => {
  fs.rmSync(sandboxPath, { recursive: true, force: true })
}
