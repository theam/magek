import { Effect, Context, Layer } from 'effect'
import type { SinonSpy } from 'sinon'

export const fakeService = <T>(tag: Context.Tag<T, T>, fakes: Fakes<T>): FakeServiceUtils<T> => {
  const fakeService: FakeService<T> = {}

  for (const [key, spy] of Object.entries(fakes) as Array<[keyof T, EffectSpy<T, keyof T>]>) {
    const fakeFunction = spy
    fakeService[key] = ((...args: Parameters<typeof fakeFunction>) =>
      Effect.sync(() => fakeFunction(...args))) as FakeService<T>[keyof T]
  }

  const layer = Layer.succeed(tag, fakeService as T)

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

type EffectResult<T> = T extends Effect.Effect<infer A, unknown, unknown> ? A : never

export type FakeOverrides<T> = Partial<Fakes<T>>

type Fakes<T> = {
  [key in keyof T]: T[key] extends (...args: infer A) => infer R ? EffectSpy<T, key> : never
}

type EffectSpy<T, key extends keyof T> = T[key] extends (...args: infer A) => infer R
  ? SinonSpy<A, EffectResult<R>>
  : never

type FakeService<T> = Partial<{
  [key in keyof T]: T[key] extends (...args: infer A) => infer R
    ? (...args: A) => Effect.Effect<EffectResult<R>>
    : never
}>
