export function GET() {
  if (process.env.NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT !== 'local-prerelease') {
    return new Response(null, {status: 404})
  }

  return Response.json(
    {
      schemaVersion: 1,
      siteId: process.env.SITE_ID ?? null,
      runId: process.env.PRERELEASE_RUN_ID ?? null,
      sourceCommit: process.env.PRERELEASE_SOURCE_COMMIT ?? null,
      buildId: process.env.PRERELEASE_NEXT_BUILD_ID ?? null,
    },
    {headers: {'Cache-Control': 'no-store'}},
  )
}
