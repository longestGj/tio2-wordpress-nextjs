# Editorial target-readiness code recheck

Date: 2026-09-08\
Scope: nine `tio2-my` Gate 8 editorial pages in `D:\16Wordpress_nextjs\.worktrees\trade4-app5-gate8`

## Reviewer issue and approved boundary

The original delivery envelope exposed only `availableGradePaths`, so the renderer could omit unavailable `/products/m-N/` actions but could not apply APP-INK and APP-PAPER C §6 to other CMS-backed internal targets. Both contracts say that a missing target route removes only the affected link or card and must not create a negative suitability statement or hidden Schema relation.

That broad rule is page-specific. APP-COAT, APP-PLAS and APP-MB C authorize unavailable Grade CTA omission but do not authorize masking their other downstream dependencies. The four Trade contracts require their procurement/Product/RFQ destinations to remain visible and treat an unavailable mandatory destination as a release blocker. In particular, RES-TRADE-BR requires both `/markets/brazil/` and `/pt-br/markets/brazil/`; they are retained even while their implementation/readiness remains unresolved.

## Resulting interface

The WordPress GraphQL JSON envelope now has two independent route-readiness fields:

- `availableGradePaths: string[]` retains the existing exact `/products/m-N/` behavior.
- `unavailableInternalPaths: string[]` contains exact trailing-slash, non-Grade internal hrefs that occur in the approved body and fail their same-scope CMS resolver. It may be non-empty only for `APP-INK` and `APP-PAPER`; every other editorial Page ID returns `[]`, and the TypeScript DTO rejects a non-empty value for those identities.

The expected renderer projection is:

```ts
sanitizeEditorialBody(
  contract.bodyHtml,
  cms.availableGradePaths,
  cms.unavailableInternalPaths,
)
```

Unavailable Grade anchors retain existing behavior: the Grade action and its content are omitted. An unavailable non-Grade anchor is unwrapped with sanitize-html's `excludeTag`, preserving its neutral text and surrounding approved copy while removing navigation. Native `#fragment` anchors and authoritative `https://` source links never enter readiness projection.

The Next query remains `cache:'no-store'`; no route availability is inferred from a remote fetch, HTTP status, href existence, or another site. The DTO validates canonical internal syntax, uniqueness, presence in the approved body, separation from Grade paths, and the APP-INK/PAPER policy before projection.

## Controlled-path resolution

The PHP registry binds exact paths to existing same-scope CMS resolvers or validators:

| Exact path | Target | Resolver/readiness source |
|---|---|---|
| `/` | HOME-001 | Unique published `tio2-my` Homepage plus exact V0.4 contract validator |
| `/applications/` | APP-000 | No Malaysia same-scope resolver; unavailable when encountered on APP-INK |
| `/products/` | PRODUCT-000 | `tio2_resolve_malaysia_product_hub_record_json` |
| `/request-a-quote/` | CONV-RFQ | `tio2_resolve_malaysia_rfq_page_record_json` |
| `/request-documents/` | CONV-DOC | `tio2_resolve_malaysia_request_documents_record_json` |
| `/request-sample/` | CONV-SAMPLE | `tio2_resolve_malaysia_request_sample_record_json` |
| Five `/applications/titanium-dioxide-for-…/` paths | APP-COAT/PLAS/MB/INK/PAPER | Unique exact editorial record, `site_scope=tio2-my`, published payload and current review validator, without recursive delivery |
| `/markets/european-union/` | MARKET-EU-001 | `tio2_resolve_malaysia_eu_market_record_json` |
| `/markets/united-kingdom/` | MARKET-UK-001 | `tio2_resolve_malaysia_uk_market_record_json` |
| `/markets/india/` | MARKET-IN-001 | `tio2_resolve_malaysia_country_market_record_json` with exact Page ID |
| `/markets/brazil/` | MARKET-BR-EN | No current resolver; retained as a Trade release blocker |
| `/pt-br/markets/brazil/` | MARKET-BR-PT | No current resolver and route remains provisional; retained as a Trade release blocker |

For the two pages permitted to suppress non-Grade links, the candidate sets are explicit:

- APP-INK: `/`, `/applications/`, `/products/`, `/request-documents/`, `/request-sample/`, `/request-a-quote/`.
- APP-PAPER: `/products/`, `/request-documents/`, `/request-sample/`, `/request-a-quote/`.

The response list is the subset of those body paths unavailable in the current CMS state. This is deterministic evidence for browser expected-body calculation. With APP-000 still lacking a Malaysia resolver, APP-INK reports `/applications/`; its breadcrumb text remains after the anchor is unwrapped. Product and conversion paths appear only if their exact scoped CMS records fail their resolver.

## Files changed

- `lib/editorial/editorial-types.ts`: adds `EditorialDto.unavailableInternalPaths`.
- `lib/wordpress/editorial-v01-dto.ts`: validates the new evidence and applies exact non-Grade anchor unwrapping while preserving Grade behavior.
- `wordpress/plugins/tio2-site-model/includes/editorial-v01.php`: extracts exact internal body paths, resolves targets without network probing, applies the page-specific policy, and returns the new envelope field.
- `tests/unit/editorial/editorial-delivery.test.ts`: verifies projection, neutral-text preservation, native/external link preservation, malformed/duplicate/Grade/foreign evidence rejection and non-authorized-page rejection.
- `tests/integration/editorial/editorial-queries.test.ts`: exercises the live-shaped envelope and retains the `no-store` assertion.
- `tests/infrastructure/php/editorial-probe.php`: checks exact href extraction and guards against policy expansion beyond APP-INK/PAPER.

No payload JSON, approved body, route file, CSS, E2E file, remote state or D23 source was changed for this fix.

## Verification evidence

- TDD RED: the focused delivery suite initially failed three cases because the new field, filtering and validation were absent.
- GREEN: `npm test -- tests/unit/editorial/editorial-delivery.test.ts tests/integration/editorial/editorial-queries.test.ts` passed 44/44 after implementation.
- Docker PHP 8.3 lint reported no syntax errors for `editorial-v01.php`.
- Read-only `wp eval-file tests/infrastructure/php/editorial-probe.php` passed scope rejection, all nine approved payloads, changed-payload rejection, exact internal-href extraction and policy-boundary assertions.
- Final focused regression run passed 67/67 across delivery, query integration, Application payload and Trade payload suites.
- `npm run typecheck` passed after Next route-type generation; targeted ESLint exited 0.

Live target mutation and browser evidence remain with the parent/reviewer. The interface is ready for the APP-INK/PAPER Product Hub mutation checks; Grade mutation checks continue to use `availableGradePaths`.
