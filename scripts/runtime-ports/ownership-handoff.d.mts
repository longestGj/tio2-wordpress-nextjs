export function boundedOutcome<T>(label: string, operation: Promise<T>, timeoutMs: number): Promise<T>
export function createOwnershipHandoff(options: {cancellation: Promise<never>; signal: AbortSignal; handoffTimeoutMs?: number; operationTimeoutMs?: number}): {
  unresolvedAcquisitions: Set<Promise<unknown>>
  acquireOwnedResource<T>(label: string, operation: Promise<T>, register: (value: T) => void, disposeLate: (value: T) => Promise<void>): Promise<T>
  acquireCleanupResource<T>(label: string, operation: Promise<T>, register: (value: T) => void, disposeLate: (value: T) => Promise<void>): Promise<T>
}
