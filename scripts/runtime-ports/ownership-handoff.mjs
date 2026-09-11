/** Bounded wait with a permanent rejection observer for delayed native replies. */
export async function boundedOutcome(label, operation, timeoutMs) {
  operation = Promise.resolve(operation)
  void operation.catch(() => {})
  let timer
  try {
    return await Promise.race([operation, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out; lease retained`)), timeoutMs)
    })])
  } finally { clearTimeout(timer) }
}

/** Shared Task 7 acquisition protocol: register once, hand off cancellation,
 * then observe/reconcile late results without blocking the returning caller. */
export function createOwnershipHandoff({cancellation, signal, handoffTimeoutMs = 5_000, operationTimeoutMs = 30_000}) {
  const unresolvedAcquisitions = new Set()
  const lateObservers = new Map()
  const observeLate = (operation, disposeLate) => {
    unresolvedAcquisitions.add(operation)
    if (lateObservers.has(operation)) return
    const observer = operation.then(async value => {
      await disposeLate(value)
      unresolvedAcquisitions.delete(operation)
    }, () => {})
    lateObservers.set(operation, observer)
    void observer.catch(() => {})
  }
  const acquireCleanupResource = async (label, operation, register, disposeLate) => {
    let settled = false
    const tracked = Promise.resolve(operation).then(value => { settled = true; return value }, error => { settled = true; throw error })
    try {
      const value = await boundedOutcome(`${label} cleanup handoff`, tracked, handoffTimeoutMs)
      register(value)
      unresolvedAcquisitions.delete(operation)
      return value
    } catch (error) {
      if (!settled) observeLate(operation, disposeLate)
      throw error
    }
  }
  const acquireOwnedResource = async (label, operation, register, disposeLate) => {
    let settled = false, registered = false
    const tracked = Promise.resolve(operation).then(value => { settled = true; return value }, error => { settled = true; throw error })
    const registerOnce = value => { if (!registered) { register(value); registered = true }; return value }
    try {
      const value = await boundedOutcome(label, Promise.race([tracked, cancellation]), operationTimeoutMs)
      registerOnce(value)
      signal.throwIfAborted()
      return value
    } catch (error) {
      if (!signal.aborted && settled) throw error
      try {
        await acquireCleanupResource(label, operation, registerOnce, disposeLate)
      } catch (handoffError) {
        throw new AggregateError([error, handoffError], `${label} cancellation handoff is uncertain after ${error.message}; ownership evidence retained: ${handoffError.message}`)
      }
      throw error
    }
  }
  return {acquireOwnedResource, acquireCleanupResource, unresolvedAcquisitions}
}
