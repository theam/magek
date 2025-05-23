import { Effect, Has, Layer, succeedWith, Tag } from '@booster-ai/common/dist/effect'
import { ShapeFn } from '@effect-ts/core/Effect'
import { SinonSpy } from 'sinon'

export const fakeService = <T extends ShapeFn<T>>(tag: Tag<T>, fakes: Fakes<T>): FakeServiceUtils<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeService: any = {}

  for (const [k, v] of Object.entries(fakes)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeFunction = v as SinonSpy<any[], any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fakeService[k] = (...args: any[]) => succeedWith(() => fakeFunction(...args))
  }

  const layer = Layer.fromValue(tag)(fakeService)

  const reset = () => {
    for (const f of Object.values(fakes)) {
      const fake = f as EffectSpy<T, keyof T>
      fake.resetHistory()
    }
  }

  return { layer, fakes, reset }
}

export type FakeServiceUtils<T extends ShapeFn<T>> = {
  layer: Layer.Layer<unknown, never, Has<T>>
  fakes: Fakes<T>
  reset: () => void
}

type EffectResult<T> = T extends Effect<any, any, infer A> ? A : never

export type FakeOverrides<T extends ShapeFn<T>> = Partial<Fakes<T>>

type Fakes<T extends ShapeFn<T>> = {
  [key in keyof T]: EffectSpy<T, key>
}

type EffectSpy<T extends ShapeFn<T>, key extends keyof T> = SinonSpy<any[], EffectResult<ReturnType<T[key]>>>
