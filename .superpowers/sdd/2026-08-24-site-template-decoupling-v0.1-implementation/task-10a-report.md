# Task 10A report — shared Preview, webhook, cache, and revalidation

## Mode

Implement.

## Proposal ID and approval record

- Proposal ID: `site-template-decoupling-v0.1`.
- Exact approved artifact: `docs/superpowers/specs/2026-08-24-site-template-decoupling-v0.1-design.md`.
- Verbatim approval quote: `同意。`
- Accepted scope: the shared Task 10A slice in `docs/superpowers/plans/2026-08-24-site-template-decoupling-v0.1-implementation.md` and `task-10a-brief.md`.

## Decisions made

- Preview signature, five-minute expiry, exact site/path HMAC message, cookie name, exact cookie path, expiry, `HttpOnly`, `SameSite=Lax`, and production `Secure` behavior remain unchanged.
- The Next.js Preview entrypoint now creates a session only for an exact owning-site `draft`; cross-site/wrong-path responses fail as `404`, malformed or unavailable WordPress responses fail as `502`, and no failure sets a Preview cookie.
- WordPress Preview remains limited to the existing Page/Post/homepage serializers. Tests prove Product cannot enter the Next.js Preview runtime even when adversarial Product route metadata is present.
- Revalidation canonicalizes at most one trailing slash from non-root paths, requires the repository's lowercase/single-hyphen managed-route grammar with the normalized 172-character bound, deduplicates canonical paths, and applies the limit to normalized unique paths. Exactly 256 are accepted; 257 are rejected before any invalidation.
- Revalidation retains the existing owning-site `site:` tag and adds owning-site `content-list:` and `sitemap:` tags. Each normalized path invalidates its owning-site route tag and local ISR path; `/` additionally retains the computable homepage content tag.
- WordPress webhook payload construction applies the same normalization, unique-path bound, malformed-path rejection, and one-site-only payload rule before any HTTP delivery.
- Duplicate webhook/revalidation events remain idempotent through the existing event ID cache and queue merge behavior. No Product Preview/query/DTO/template/runtime was introduced.

## Unresolved decisions and integration concerns

- No product, route-inventory, publication-policy, migration, or cache-contract decision remains unresolved in the shared slice.
- Full `npm test` currently has exactly two expected integration failures in Homepage-owned `tests/integration/homepage/revalidation.test.ts`: its root and non-root expected tag lists do not yet include the approved `content-list:tio2-a` and `sitemap:tio2-a` tags. Task 10A did not edit that file. Task 10B owns the assertion update.
- Non-blocking Audit note: `content-list:` and `sitemap:` are now emitted consistently by migration/Webhook/revalidation contracts, but no cache fetch currently attaches those two names. Effective local eviction continues to use the existing `site:`, `route:`, homepage content tags and `revalidatePath`. Attaching new cache consumers would require files outside the approved Task 10A ownership and is not necessary for the current effective eviction path.

## Files and interfaces affected

- Shared runtime: `app/api/preview/route.ts`, `app/api/revalidate/route.ts`, `lib/wordpress/cache-tags.ts`, `wordpress/plugins/tio2-site-model/includes/webhooks.php`.
- Shared tests: `wordpress/tests/preview.php`, `wordpress/tests/webhook-routing.php`, `tests/integration/routes/content-page.test.tsx`.
- Additional mechanically required shared focused tests: `tests/integration/api/preview.test.ts`, `tests/integration/api/revalidate.test.ts`, `tests/unit/wordpress/cache-tags.test.ts`.
- `wordpress/plugins/tio2-site-model/includes/preview.php` required no production change; its existing Page/Post-only lookup already rejects Product, and new WordPress coverage preserves that boundary.
- Homepage-owned `tests/integration/homepage/preview.test.ts` and `tests/integration/homepage/revalidation.test.ts` were not edited.

## TDD RED evidence

- Baseline: `npm test -- tests/integration/api/preview.test.ts tests/integration/api/revalidate.test.ts tests/integration/routes/content-page.test.tsx` — 65/65 passed before changes.
- Baseline WordPress: `preview.php` and `webhook-routing.php` — both passed before changes.
- RED TypeScript command: `npm test -- tests/unit/wordpress/cache-tags.test.ts tests/integration/api/preview.test.ts tests/integration/api/revalidate.test.ts tests/integration/routes/content-page.test.tsx` — 80 passed, 23 failed. Expected failures showed missing cache-tag/normalization helpers, unhandled cross-site/wrong-path/malformed Preview source responses, non-draft Preview returning 307, missing content-list/Sitemap tags, and 257 raw paths being rejected before canonical deduplication.
- RED WordPress Preview command stayed GREEN because unsigned/expired/wrong-path/malformed/Product rejection was existing behavior that this task preserves.
- RED WordPress Webhook command: `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/webhook-routing.php` — failed with `Webhook payload did not normalize and deduplicate exact paths`.
- Independent Audit found that the first normalizer reused the older permissive URL-safety validator. Follow-up RED TypeScript command produced 8 expected failures because `/Products`, `/bad path`, and invalid hyphen grammar were accepted; follow-up WordPress Webhook RED failed with `Webhook payload retained malformed path /Products`.
- The root cause was validator mismatch: cache/Webhook inputs used a safe-URL grammar while managed routes use lowercase slash-separated words with single hyphens and a 172-character normalized limit. The fix enforces that exact grammar after removing at most one non-root trailing slash; PHP delegates to the existing canonical `tio2_is_valid_public_path()` source.

## GREEN and verification evidence

- Focused TypeScript after the Audit correction: 4 files, 112/112 tests passed. Permanent tests include `/`, single trailing-slash normalization, multiple-trailing-slash rejection, canonical uppercase/whitespace/hyphen rejection, and the normalized 172/173 boundary.
- WordPress Preview: `TiO2 signed draft preview smoke test passed`.
- WordPress Webhook routing: `TiO2 per-site webhook routing smoke test passed`.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Full non-Homepage-owned regression after the Audit correction: `npm test -- --exclude tests/integration/homepage/revalidation.test.ts` — 44 files passed, 5 skipped; 447 tests passed, 8 skipped.
- Full repository regression after the Audit correction: `npm test` — 44 files passed, 5 skipped; 447 tests passed, 8 skipped; exactly 2 failures, both the Task 10B Homepage-owned expected-tag integration concern recorded above.
- Relevant WordPress gates passed: `smoke.php`, `publication.php`, `product-publication.php`, and `root-only-retirement-safety.php`.
- `git diff --check`: passed; only repository line-ending conversion notices were emitted.
- Independent read-only follow-up Audit: **Clean**; the earlier canonical-validator Important is resolved, with no remaining Critical or Important findings.

## Migration impact

- No record, status, scope, content, media, snapshot, migration, or restore mutation occurred.
- Task 9C local invalidation batches already emit the same `content-list:{site}` and `sitemap:{site}` names; Task 10A aligns the shared Next.js/Webhook contract with those names and the 256-path bound.

## External actions

`external actions: none`.

No push, deployment, DNS, indexing, remote CMS write, production migration, production cache operation, or other remote action occurred.
