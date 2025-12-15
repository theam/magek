import type { SinonSpy } from 'sinon'

/**
 * Creates a fake service for testing purposes.
 * The fakes are wrapped to work with both sync and async service methods.
 */
export const fakeService = <T extends object>(fakes: Fakes<T>): FakeServiceUtils<T> => {
  const service: Partial<T> = {}

  for (const [key, spy] of Object.entries(fakes) as Array<[keyof T, SinonSpy]>) {
    // Create a wrapper that calls the spy and returns its result
    // This works for both sync and async methods
    service[key] = ((...args: unknown[]) => {
      const result = spy(...args)
      // If the spy returns a promise-like, return it directly
      // Otherwise wrap in resolved promise for consistency
      return result
    }) as T[keyof T]
  }

  const reset = () => {
    for (const f of Object.values(fakes)) {
      const fake = f as SinonSpy
      fake.resetHistory()
    }
  }

  return { service: service as T, fakes, reset }
}

export type FakeServiceUtils<T> = {
  service: T
  fakes: Fakes<T>
  reset: () => void
}

export type FakeOverrides<T> = Partial<Fakes<T>>

type Fakes<T> = {
  [key in keyof T]: T[key] extends (...args: infer A) => infer R ? SinonSpy<A, Awaited<R>> : never
}
