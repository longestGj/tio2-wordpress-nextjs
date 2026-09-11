export function requiredLocalUrl(
  environmentName: string,
  expectedPath = '/',
  environment: Record<string, string | undefined> = process.env,
): URL {
  const raw = environment[environmentName]
  if (!raw?.trim()) throw new Error(`${environmentName} is required`)
  let url: URL
  try { url = new URL(raw) } catch {
    throw new Error(`${environmentName} must be a loopback HTTP URL`)
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error(`${environmentName} must be a loopback HTTP URL`)
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== expectedPath) {
    throw new Error(`${environmentName} must use path ${expectedPath} without credentials, query, or fragment`)
  }
  return url
}
