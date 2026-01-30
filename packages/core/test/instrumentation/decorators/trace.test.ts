 
import { MagekConfig, TraceActionTypes, TraceInfo } from '@magek/common'
import { Magek, trace } from '../../../src'
import { expect } from '../../expect'
import { stub } from 'sinon'

describe('the `trace` decorator', async () => {
  afterEach(() => {
    const magek = Magek as any
    delete magek.config.traceConfiguration
  })

  context('When a method is called', async () => {
    it('Injects the correct `this` to the traced method', async () => {
      Magek.config.traceConfiguration = {
        enableTraceNotification: true,
        includeInternal: false,
        onStart: CustomTracer.onStart,
        onEnd: CustomTracer.onEnd,
      }

      const testClass = new TestClass()
      await testClass.myCustomMethod('test')
      expect(testClass.innerField).to.be.eq('test')
    })

    it('onStart and onEnd methods are called in the expected order', async () => {
      const executedMethods: Array<string> = []
      stub(CustomTracer, 'onStart').callsFake(
        async (_config: MagekConfig, _actionType: string, _traceInfo: TraceInfo): Promise<void> => {
          executedMethods.push('onStart')
        }
      )
      stub(CustomTracer, 'onEnd').callsFake(
        async (_config: MagekConfig, _actionType: string, _traceInfo: TraceInfo): Promise<void> => {
          executedMethods.push('onEnd')
        }
      )
      Magek.config.traceConfiguration = {
        enableTraceNotification: true,
        includeInternal: false,
        onStart: CustomTracer.onStart,
        onEnd: CustomTracer.onEnd,
      }

      const testClass = new TestClass()
      await testClass.myCustomMethod('test')
      expect(executedMethods).to.have.same.members(['onStart', 'onEnd'])
    })
  })
})

class TestClass {
  public innerField = ''

  @trace(TraceActionTypes.CUSTOM)
   
  // @ts-ignore
  public async myCustomMethod(param: string): Promise<void> {
    this.innerField = param
  }
}

class CustomTracer {
  static async onStart(_config: MagekConfig, _actionType: string, _traceInfo: TraceInfo): Promise<void> {}

  static async onEnd(_config: MagekConfig, _actionType: string, _traceInfo: TraceInfo): Promise<void> {}
}
