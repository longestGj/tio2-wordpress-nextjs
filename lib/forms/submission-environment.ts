export const LOCAL_PRERELEASE_ENVIRONMENT = 'local-prerelease' as const
export type SubmissionEnvironment = typeof LOCAL_PRERELEASE_ENVIRONMENT | null

export function resolveSubmissionEnvironment(value: string | undefined): SubmissionEnvironment {
  return value === LOCAL_PRERELEASE_ENVIRONMENT ? value : null
}

export function submissionEnvironmentFields(
  environment: SubmissionEnvironment,
  token: string,
): Readonly<Record<string, string>> {
  if (!environment) return {}
  if (!token.trim()) throw new Error('Local prerelease submissions require a unique test run ID')
  return {environment, test_run_id: token} as const
}

export function buildSubmissionEnvironment(
  runtimeEnvironment: string | undefined,
  testRunId: string,
  subject: string,
): {
  readonly subject: string
  readonly fields: Readonly<Record<string, string>>
} {
  const environment = resolveSubmissionEnvironment(runtimeEnvironment)
  if (!environment) return {subject, fields: {}}
  return {
    subject: `[LOCAL PRERELEASE] ${subject}`,
    fields: submissionEnvironmentFields(environment, testRunId),
  }
}
