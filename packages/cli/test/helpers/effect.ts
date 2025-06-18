import { Effect, Context, Layer } from 'effect'
import { SinonSpy } from 'sinon'

export const fakeService = <T>(tag: Context.Tag<T, T>, fakes: Fakes<T>): FakeServiceUtils<T> => {
   
  const fakeService: any = {}

  for (const [k, v] of Object.entries(fakes)) {
     
    const fakeFunction = v as SinonSpy<any[], any>
     
    fakeService[k] = (...args: any[]) => Effect.sync(() => fakeFunction(...args))
  }

  const layer = Layer.succeed(tag, fakeService)

  const reset = () => {
    for (const f of Object.values(fakes)) {
      const fake = f as EffectSpy<T, keyof T>
      fake.resetHistory()
    }
  }

  return { layer, fakes, reset }
}

export type FakeServiceUtils<T> = {
  layer: Layer.Layer<T>
  fakes: Fakes<T>
  reset: () => void
}

type EffectResult<T> = T extends Effect.Effect<infer A, any, any> ? A : never

export type FakeOverrides<T> = Partial<Fakes<T>>

type Fakes<T> = {
  [key in keyof T]: T[key] extends (...args: any[]) => any ? EffectSpy<T, key> : never
}

type EffectSpy<T, key extends keyof T> = T[key] extends (...args: any[]) => any 
  ? SinonSpy<any[], EffectResult<ReturnType<T[key]>>>
  : never
