# CONV-DOC Local WordPress Singleton Evidence

Date: 2026-09-04
Scope: local production-equivalent verification only
Parent revision: `616193f3dbf059f0e081c8d59119c008ba2b848b`
Deployment, production database, DNS and indexing actions: none

## Target environment

- Docker Compose project: `wordpress`
- WordPress site URL: `http://localhost:8080`
- Database volume: `wordpress_db_data`
- WordPress volume: `wordpress_wp_data`
- Plugin bind mount: this worktree's `wordpress/plugins/tio2-site-model`
- Migration: `wordpress/seed/apply-tio2-my-request-documents.php`

The worktree contains no local `wordpress/.env`; the existing main-checkout local environment file was used only to address the same Compose project and existing volumes. No production credential or database was used.

## Before migration

- Matching scoped records: `0`
- WPGraphQL result: `The Malaysia Request Documents record is missing.`

## Migration result

The existing WP-CLI seed returned:

```json
{"status":"passed","postId":17368,"pageId":"CONV-DOC","siteScope":"tio2-my","publicPath":"/request-documents"}
```

## Read-back verification

| Field | Result |
|---|---|
| Same-slug records across scopes | `1` |
| Matching scoped records | `1` |
| Post ID | `17368` |
| Post type | `tio2_request_docs` |
| Slug | `tio2-my-request-documents` |
| Status | `publish` |
| Site scopes | exactly `tio2-my` |
| Public path | `/request-documents` |
| Stored bytes | `5723` |
| Approved bytes | `5723` |
| Stored SHA-256 | `6951A581A8A6301CA885D9C8394E3D08477B412194762CF6FC35B1116D444023` |
| Approved SHA-256 | `6951A581A8A6301CA885D9C8394E3D08477B412194762CF6FC35B1116D444023` |
| Byte-exact comparison | `true` |
| WordPress contract validator | `true` |

The live WPGraphQL field returned `request-documents-page-17368`, `status=publish`, `siteScopes.nodes[0].slug=tio2-my`, `publishingFields.publicPath=/request-documents` and the approved contract JSON. No cross-scope fallback was used.

## Production-build route verification

A fresh isolated Next.js production build used `SITE_ID=tio2-my`, `WORDPRESS_GRAPHQL_URL=http://127.0.0.1:8080/graphql`, `VERCEL_ENV=preview` and a new dist directory so no pre-migration data-cache entry could be reused.

- `/request-documents/`: HTTP `200`
- `/request-documents`: HTTP `308`, `Location: /request-documents/`
- One H1: `Request Documents`
- Canonical: `https://tio2malaysia.com/request-documents/`
- Robots: `noindex, nofollow`
- JSON-LD types: `WebPage`, `BreadcrumbList`
- Form, eight approved fields, fourteen grade options and five document types: present
- Cross-scope output: none

## Automated verification

- Request Documents unit, integration, WordPress infrastructure and proxy tests: `12` files, `104` tests passed.
- Production Playwright Request Documents suite: `15/15` passed across 1440, 768, 390, 320, 375, 430, 1024 and 1280 CSS-pixel checks.
- Production Playwright Markets regression suite: `4/4` passed, including the direct `/markets/` representation and 390, 768 and 1440 CSS-pixel contracts.
- Production build: passed, 35 routes generated.
- Targeted ESLint, TypeScript and `git diff --check`: passed.

## Remaining release blockers

- This record exists only in the local Compose database. Applying it to production WordPress still requires separate production authorization and migration evidence.
- The production-equivalent document-request receiver remains outside this singleton task and must be verified separately.
- Indexing remains unauthorized by the approved contract.
- The local environment does not define TiO2 Malaysia revalidation/preview URL and secret values; a fresh isolated build was used for this read-back verification rather than claiming webhook invalidation.
