import * as fs from 'fs'
import { fake, replace, restore } from 'sinon'
import { expect } from '../../expect.js'
import { createFileSystemService } from '../../../src/services/file-system/live.impl.js'

describe('FileSystem - Live Implementation', () => {
  afterEach(() => {
    restore()
  })

  it('uses fs.promises.readdir', async () => {
    const fakeReaddir = fake.resolves(['file1', 'file2'])
    replace(fs.promises, 'readdir', fakeReaddir)

    const directoryPath = 'directoryPath'
    const fileSystemService = createFileSystemService()

    await fileSystemService.readDirectoryContents(directoryPath)
    expect(fs.promises.readdir).to.have.been.calledWith(directoryPath)
  })
})
