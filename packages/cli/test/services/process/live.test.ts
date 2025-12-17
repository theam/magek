import { fake, replace, restore } from 'sinon'
import { createProcessService } from '../../../src/services/process/live.impl.js'
import { expect } from '../../expect.js'

describe('Process - Live Implementation', () => {
  beforeEach(() => {
    replace(process, 'cwd', fake.returns(''))
  })

  afterEach(() => {
    restore()
  })

  it('uses process.cwd', () => {
    const processService = createProcessService()
    processService.cwd()
    expect(process.cwd).to.have.been.called
  })

  it('uses execa.command', async () => {
    const command = 'command'
    const cwd = 'cwd'
    const fakeExeca = fake.resolves({ stdout: '', stderr: '' })
    const processService = createProcessService(fakeExeca)

    await processService.exec(command, cwd)
    expect(fakeExeca).to.have.been.calledWith(command, { cwd })
  })
})
