import { FileSystemService } from '../../../src/services/file-system/index.ts'
import { fake } from 'sinon'
import { fakeService, type FakeOverrides } from '../../helpers/effect.ts'

export const makeTestFileSystem = (overrides?: FakeOverrides<FileSystemService>) =>
  fakeService(FileSystemService, {
    readDirectoryContents: fake.returns([]),
    readFileContents: fake.returns('{}'),
    ...overrides,
  })
