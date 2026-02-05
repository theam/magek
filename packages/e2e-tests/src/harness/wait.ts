export interface WaitOptions {
  timeoutMs?: number
  intervalMs?: number
  message?: string
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const waitFor = async <T>(
  check: () => Promise<T | false> | T | false,
  options: WaitOptions = {}
): Promise<T> => {
  const timeoutMs = options.timeoutMs ?? 30000
  const intervalMs = options.intervalMs ?? 500
  const message = options.message ?? 'Condition not met before timeout'
  const start = Date.now()
  let lastError: unknown

  while (Date.now() - start < timeoutMs) {
    try {
      const result = await check()
      if (result) {
        return result
      }
    } catch (error) {
      lastError = error
    }

    await sleep(intervalMs)
  }

  if (lastError) {
    throw new Error(`${message}. Last error: ${String(lastError)}`)
  }

  throw new Error(message)
}
