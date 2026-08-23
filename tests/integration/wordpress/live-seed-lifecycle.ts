interface RestoreLifecycle {
  readonly cleanup: readonly (() => void)[]
  readonly restore: () => void
  readonly audit: () => void
}

export function runUnconditionalRestore({
  cleanup,
  restore,
  audit,
}: RestoreLifecycle): void {
  const failures: unknown[] = []

  for (const action of [...cleanup, restore, audit]) {
    try {
      action()
    } catch (error) {
      failures.push(error)
    }
  }

  if (failures.length === 0) return

  const [primary, ...suppressed] = failures
  if (primary instanceof Error && suppressed.length > 0) {
    ;(primary as Error & {suppressed?: unknown[]}).suppressed = suppressed
  }
  throw primary
}
