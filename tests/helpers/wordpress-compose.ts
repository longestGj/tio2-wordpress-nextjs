export function wordpressComposeArgs(environment: Record<string, string | undefined> = process.env): string[] {
  const args = [
    'compose', '--env-file', environment.TIO2_TEST_WORDPRESS_ENV ?? 'wordpress/.env',
    '-f', environment.TIO2_TEST_WORDPRESS_COMPOSE ?? 'wordpress/docker-compose.yml',
  ]
  if (environment.TIO2_TEST_WORDPRESS_PROJECT) {
    args.push('--project-name', environment.TIO2_TEST_WORDPRESS_PROJECT)
  }
  return args
}
