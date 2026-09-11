import {randomBytes} from 'node:crypto'

export type WordPressDataMode = 'isolated' | 'shared-read-only' | 'shared-mutating'

export interface WordPressComposeOptions {
  dataMode: WordPressDataMode
  runId: string
  hostHttp: boolean
  serialMutationAuthorized?: boolean
}

export function wordpressComposeArgs(
  options: WordPressComposeOptions,
  environment: Record<string, string | undefined> = process.env,
): string[] {
  if (!options || !['isolated', 'shared-read-only', 'shared-mutating'].includes(options.dataMode)) {
    throw new Error('An explicit WordPress dataMode is required')
  }
  if (!options.runId || typeof options.runId !== 'string' || typeof options.hostHttp !== 'boolean') {
    throw new Error('WordPress runId and hostHttp are required')
  }
  if (options.dataMode === 'shared-mutating' && options.serialMutationAuthorized !== true) {
    throw new Error('Shared mutation requires explicit serial authorization')
  }
  if (environment.TIO2_TEST_WORDPRESS_PROJECT) {
    throw new Error('Environment project overrides are not allowed; choose an explicit dataMode')
  }
  const isolated = options.dataMode === 'isolated'
  const slug = options.runId.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 41) || 'run'
  const projectName = isolated ? `d16-test-${slug}-${randomBytes(6).toString('hex')}` : 'wordpress'
  const args = [
    'compose', '--project-name', projectName,
    '--env-file', environment.TIO2_TEST_WORDPRESS_ENV ?? 'wordpress/.env',
    '-f', environment.TIO2_TEST_WORDPRESS_COMPOSE ?? 'wordpress/docker-compose.yml',
  ]
  if (isolated) {
    args.push('-f', `wordpress/docker-compose.test-${options.hostHttp ? 'random-http' : 'no-host'}.yml`)
  }
  return args
}
