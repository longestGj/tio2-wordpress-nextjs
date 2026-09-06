# RES-PROC Gate 8 Implementation Receipt

## Control

- Task: RES-PROC — Gate 8 scoped implementation and local verification
- Site scope: `tio2-my`
- Page ID: `RES-PROC`
- Route: `/resources/chloride-vs-sulfate-titanium-dioxide/`
- Canonical: `https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/`
- Branch: `codex/res-proc-gate8`
- Shared buying-guide base: `53ec50213f806ed4a9995042c4431f8e4376d36d`
- Exact implementation commit: `a0a1253a25959fa704e9b2a23ffa69287c61f2c7`
- Gate 7 package: `RES-PROC-G7-HANDOFF-01`
- Local preview: `http://127.0.0.1:3013/resources/chloride-vs-sulfate-titanium-dioxide/`

## Environment

- Windows local worktree: `C:\Users\longe\.codex\worktrees\5a34\16Wordpress_nextjs`
- Node.js: `v24.16.0`
- npm: `11.13.0`
- Next.js: `16.3.2`
- Playwright: `1.62.1`, Chromium project
- Docker: `29.6.2`
- Local WordPress container: `wordpress-wordpress-1`
- Local CMS fixture post: `14708`, exact scope `tio2-my`, status `publish`
- No production CMS write, deployment, DNS, sitemap submission, indexing activation, migration, or remote repository write occurred.

## Resolved Implementation

- Contract and registry: `wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json`, `wordpress/plugins/tio2-site-model/config/tio2-my-resource-page-registry.json`
- WordPress binding: `wordpress/plugins/tio2-site-model/includes/resource-proc-v01.php`, `wordpress/seed/apply-tio2-my-resource-proc.php`
- API/ViewModel: `lib/wordpress/resource-proc-v01-types.ts`, `lib/wordpress/resource-proc-v01-dto.ts`, `lib/wordpress/resource-proc-v01-queries.graphql`, `lib/wordpress/resource-proc-v01-queries.ts`
- Route/UI: `app/resources/chloride-vs-sulfate-titanium-dioxide/page.tsx`, `components/sites/tio2-my/resources/malaysia-resource-proc-page.tsx`, `components/sites/tio2-my/resources/malaysia-resource-proc-page.module.css`, `components/sites/tio2-my/resources/resource-proc-faq.tsx`
- SEO/Schema: `lib/seo/resource-proc-metadata.ts`, `lib/seo/resource-proc-jsonld.ts`, `lib/resources/malaysia-resource-proc-article.ts`
- Cache/invalidation: `lib/wordpress/cache-tags.ts`, `app/api/revalidate/route.ts`, `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- Browser fixture: `tests/fixtures/res-proc-preview-graphql-server.mjs`

## Payload and Content Parity

- Approved contract SHA-256: `64F724390398B383276E636176302B06A9FD0C5B6D09017C5F666F54A253E053`
- Fourteen modules are emitted in the approved order.
- Required counts pass: routes 2; can-indicate 4; cannot-establish 6; grade rows 6; overlap statements 3; workflow steps 5; outcomes 3; buyer questions 4; source groups 6; source links 7; Process actions 2.
- Public projection removes release controls, internal revisions, primary keyword, relation readiness fields, and source evidence status.
- Default eligible relations are Home, Resources, and Products. Chloride and sulfate Process actions are absent because the two owner routes are not implemented. The pair is emitted only when both records are eligible. Products remains independent.
- Revoking one approved application source removes the application claim/citation/action block and that source's public group/link. Revoking an official process source blocks projection rather than leaving unsupported route claims.

## Metadata and Structured Data Capture

- Title: `Chloride vs Sulfate Titanium Dioxide | Buyer Guide`
- Meta description: `Compare chloride and sulfate titanium dioxide routes, learn what route labels can indicate, and identify the grade-level evidence buyers still need to check.`
- Canonical: `https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/`
- Robots: `noindex, nofollow`
- H1 count: `1`
- Default rendered JSON-LD script count in the browser DOM: `1`
- Default graph types: `WebPage`, `BreadcrumbList`
- Article state: absent by default; present only for complete approved visible author, publisher, publisher logo, publication/modification/review dates, and maintenance owner. Integration tests verify visible/structured parity.
- Prohibited types absent: `FAQPage`, `QAPage`, `HowTo`, `Product`, `Offer`, `Review`, `AggregateRating`.

## Source Status — 2026-09-06

Each exact approved URL returned HTTP 200 with redirect following enabled:

1. U.S. EPA technical support document
2. JRC BREF source page
3. JRC preliminary report PDF
4. EUR-Lex Case M.8451 record
5. Tronox Titanium Dioxide page
6. LB Group BLR-886 page
7. LB Group LR-108 technical data sheet PDF

No source URL, label, statement family, or visible review date was substituted.

## Verification Results

- `npm run lint`: exit 0; two inherited warnings in `docs/prototypes/site-a-resources/build-visual-prototype.mjs`, zero errors.
- `npm run typecheck`: exit 0.
- Focused RES-PROC, RES-ORIGIN regression, revalidation, and shared-menu Vitest selection: 25 files, 177 tests passed.
- `npx playwright test tests/e2e/res-proc-gate8.spec.ts --config=playwright.config.ts`: 8 passed.
- Browser coverage: 1440, 1024, 768, 430, 390, 375, open mobile menu/FAQ focus, and 200% browser scale.
- Browser assertions: zero axe violations; no horizontal page overflow; target sizes at least 44 CSS px; Grade records preserve question/evidence/interpretation; long source labels remain in viewport; all Buyer Question answers exist in server HTML; mobile menu traps focus, responds to Escape, restores focus, and makes main/footer inert.
- PHP syntax: both RES-PROC include and seed reported no syntax errors through PHP in `wordpress-wordpress-1`.
- WordPress GraphQL readback: exact `tio2-my` record returned from `malaysiaResourceProcRecordJson` for local post `14708`.
- Live WordPress mutable-state proof: 1 test passed against local post `14708`, covering Process-pair atomicity, application-source revocation, duplicate-source rejection, complete Article projection, incomplete Article fail-closed behavior, and restoration of the original metadata under a database lock.
- `npm run build` with `SITE_ID=tio2-my` and the real local WordPress GraphQL endpoint: exit 0; 38 static pages generated; RES-PROC remains a dynamic server route.
- Protected inventory diff: no changes to `public-routes.json` or `app/sitemap.ts`; RES-PROC remains outside the controlled public inventory and sitemap.
- Protected content diff: no changes to the RES-ORIGIN component or content contract. Site A content and frozen Site B files were not changed.

The repository-wide `npm test` run completed with 2,296 passes, 48 skips, and 29 failures. No RES-PROC test failed. Twenty-three failures are local WordPress/import gates caused by the development worktree not containing `wordpress/.env`. The other six reproduce in isolation in files unchanged from the base: one DOC-TDS fixture hash mismatch, one existing homepage revalidation expectation, three Site A application/resource public-route expectations, and one Site A Products asset test timeout. These inherited exceptions were not modified because they are outside the authorized Site A/Site B boundary.

## Screenshots

- `docs/verification/res-proc/screenshots/res-proc-1440.png`
- `docs/verification/res-proc/screenshots/res-proc-1024.png`
- `docs/verification/res-proc/screenshots/res-proc-768.png`
- `docs/verification/res-proc/screenshots/res-proc-430.png`
- `docs/verification/res-proc/screenshots/res-proc-390.png`
- `docs/verification/res-proc/screenshots/res-proc-375.png`
- `docs/verification/res-proc/screenshots/res-proc-390-menu-open.png`
- `docs/verification/res-proc/screenshots/res-proc-390-faq-focus.png`

Visual review found no blocker-level variance: route cards retain equal weight, the six-row evidence ledger stays readable, process meaning is text-labelled rather than color-only, source labels wrap safely, and the mobile page uses one continuous column without excess action whitespace.

## Rollback

- Code rollback boundary: revert the seven implementation commits after `53ec50213f806ed4a9995042c4431f8e4376d36d`, ending at implementation commit `a0a1253a25959fa704e9b2a23ffa69287c61f2c7`. The receipt commit is documentation-only.
- Local CMS rollback target: delete local fixture post `14708` only after confirming the exact `resource_id=RES-PROC`, `site_scope=tio2-my`, and public path recorded above.
- The transient local WordPress MU loader was removed after runtime verification; its reproducible source remains in `tests/fixtures/res-proc-wordpress-preview-loader.php`.
- No production rollback is required because no production or remote state was changed.
