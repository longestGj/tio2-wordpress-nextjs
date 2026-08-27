# Runtime Task 9 report: protected editorial browser proof

## Outcome and scope

Task 9 is implemented as protected-runtime proof only. Five complete synthetic Site A Application/Resource views were exercised through a real local WordPress preview endpoint and a fresh controlled Next.js development server at desktop and mobile sizes. All ten protected browser cases and all five anonymous canonical 404 cases passed. A sixteenth E2E regression proves that a concurrent Task 9 startup fails closed without disturbing the active server.

No real Application/Resource copy was integrated. No record was published, no Strict Apply was run, and no Product, Homepage, navigation, sitemap, public inventory, `public/`, Site B content/template, remote WordPress, deployment, DNS, indexing, controller ledger, or production state was changed. `verify:root-only` was not run.

The required `agent-browser` CLI was not installed or exposed (`Get-Command agent-browser` returned no command). Installed Playwright was used as the documented equivalent browser driver. The equivalent checklist explicitly covered page load, redirect, meaningful body, expected interactive CTA, no Next error overlay, console/page/request failures, blocked remote requests, screenshots, and Next server-log correlation.

## Hash-gated local data sequence

The Task 8 local-boundary assertion passed against the repository Docker WordPress. `wordpress-db-1` was healthy and `wordpress-wordpress-1` was running only on `127.0.0.1:8080`.

Before hashes:

| Input/invariant | SHA-256 |
|---|---|
| Raw Application fixture | `ca5b86273f519ac8bd4d54316ff4a953521d55363804a3038205604149ee94c4` |
| Raw Resource fixture | `21d448151c095abc1813272e218331786045f540a519ad0617b56872f310b794` |
| Product manifest | `4e3bf3da49642a6dc01da3c808d784cc2b234cd312c2ab4881a7786dc1afc57c` |
| Product validator output | `3912fd5745ff70221b27df10736bbf6079f32134bafdd52dfb487953ffdfe0c3` |
| Public-route inventory | `828b8303505d8528918c3eff01792ddd96393e199fd25d103002fd7fadbcc5b8` |
| Normalized Application population | `sha256:77532810bfe93af4b7497342278122ed1b85d898049a415c579df3b24ba12331` |
| Normalized Resource population | `sha256:e70d4ba190404c695f3aa5916c1e11c433b0b0f8c5ce810f7ef96ab110768792` |
| Normalized 39-record readback | `sha256:dceb63a584b223e7857a47bf791bc3db5f4a0059652932bf3d571ca653639315` |
| Deferred Product edges | `sha256:e04c77af8f66774c09b443f691faf25840afe42b5ca8920006d3a505245a7c03` |
| Site B invariant | `sha256:3eae18f5bcc98ae4d2f1ff593c4e7867d9517e6d1654317c610ddef6f4371a58` |

The first exact `DeferredProductRelations` Plan reported 28 Applications plus 11 Resources, all 39 actions `no-change`, no create/update, and exactly 39 deferred Product edges. Its deterministic plan hash was `48deb4de7c1143c73b69db421e079b45bad45b767133bfe01ff62b40cdb9636f`.

Only after that exact gate passed, the matching no-change Deferred Apply was run. Its fresh internal Plan and Apply both returned the same 39 `no-change` actions, 39 deferred edges, and plan hash. An immediate second Plan returned the same result. No Strict Apply was attempted.

The exact deferred list was `relationships -> TP-P100` from every managed source below:

- Applications: `applications-hub`, `automotive-coatings`, `coatings`, `decorative-paper`, `decorative-paper-detail`, `electrophoretic-coating`, `film-masterbatch`, `functional-materials`, `high-purity`, `high-pvc-flat-paint`, `laminated-decorative-paper`, `lcp-high-temperature-plastics`, `marine-aerospace-protective`, `masterbatch`, `mlcc-electronic-ceramics`, `outdoor-pvc`, `photovoltaic-white-film`, `plastics`, `polycarbonate`, `powder-coil-coatings`, `printing-ink`, `printing-inks`, `soft-pvc-solar-backsheet`, `solar-film`, `universal-multi-application`, `uv-resistant-engineering-plastics`, `water-based-paint`, `waterborne-automotive-coatings`.
- Resources: `article-01`, `article-02`, `article-03`, `article-04`, `article-05`, `article-06`, `article-07`, `article-08`, `article-09`, `article-10`, `resources-hub`.

The final post-E2E audit again returned 39 records, 28 Applications, 11 Resources, 39 deferred edges, and all five aggregate hashes byte-identical to the before values above. The raw fixture, Product manifest, and public inventory hashes were also unchanged after E2E.

## Browser proof

The fresh server used the current Task 6–7 source via `next dev`, a dynamically reserved loopback port, the real local GraphQL/REST endpoints, strict local URL checks, redacted server logs, and process-tree cleanup. No synthetic page payload was mirrored into a fake server.

| View | Canonical source -> protected target | 1440×1000 | 360×800 |
|---|---|---|---|
| Application Hub | `/applications` -> `/preview/applications` | PASS — `.tmp/task-9-editorial-preview-evidence/applications-hub-desktop.png` | PASS — `.tmp/task-9-editorial-preview-evidence/applications-hub-mobile.png` |
| Application Category | `/applications/coatings` -> `/preview/applications/coatings` | PASS — `.tmp/task-9-editorial-preview-evidence/coatings-desktop.png` | PASS — `.tmp/task-9-editorial-preview-evidence/coatings-mobile.png` |
| Application Detail | `/applications/titanium-dioxide-for-water-based-paint` -> `/preview/applications/titanium-dioxide-for-water-based-paint` | PASS — `.tmp/task-9-editorial-preview-evidence/water-based-paint-desktop.png` | PASS — `.tmp/task-9-editorial-preview-evidence/water-based-paint-mobile.png` |
| Resource Hub | `/resources` -> `/preview/resources` | PASS — `.tmp/task-9-editorial-preview-evidence/resources-hub-desktop.png` | PASS — `.tmp/task-9-editorial-preview-evidence/resources-hub-mobile.png` |
| Resource Article | `/resources/rutile-vs-anatase-titanium-dioxide` -> `/preview/resources/rutile-vs-anatase-titanium-dioxide` | PASS — `.tmp/task-9-editorial-preview-evidence/article-01-desktop.png` | PASS — `.tmp/task-9-editorial-preview-evidence/article-01-mobile.png` |

The Playwright-equivalent Skill checklist screenshot is `.tmp/task-9-editorial-preview-evidence/agent-browser-skill-playwright-check.png`. All eleven screenshots were visually inspected.

Every protected case proved:

- the direct protected URL was 404 without a cookie and caused no WordPress preview call;
- signed `/api/preview` performed a real WordPress validation, returned an exact 307, and set one exact-path HttpOnly/SameSite=Lax token cryptographically bound to `tio2-a` plus the canonical source path;
- the cookie-bearing 307 and exact Site A Application/Resource WordPress response contained `private, no-store`, with no Next cache-hit header;
- the rendered Next 16 development shell contained `no-cache, must-revalidate` because Next 16.3.2 forcibly replaces rendered response cache headers in development at `node_modules/next/dist/server/base-server.js`; the test accepts that development-only forced value while rejecting cache hits and separately requiring no-store at both protected source/entry boundaries;
- one H1, correct renderer mode, exact semantic section order, visible Direct Answer, four FAQ items, CTA, disclaimer, correct Hub children or Detail/Article content, and only null-href relationship spans;
- Resource tables had caption, column headers, an accessible labelled/focusable scroll region, working horizontal scroll where required, and no document-level horizontal overflow;
- keyboard order followed visible focusable controls; no hidden/dead link captured focus;
- `noindex,nofollow`, no canonical, no JSON-LD, no download/PDF/TDS path, no private local/source/evidence metadata or paths, no manufacturer/legal text, and no Site B/domain leakage;
- zero unexpected console errors, page errors, request failures, HTTP failures other than the intentionally asserted document 404s, blocked remote requests, Next overlays, server errors, or unstable-layout changes.

All five canonical Application/Resource URLs independently returned anonymous 404, contained no protected content, and generated no WordPress preview call.

The Product regression suite now runs from current source through the same owned fresh-development-server lifecycle. It uses a separately reserved loopback port, `.next-task-9-product`, `.tmp/task-9-product-preview.lock`, plus the shared `.tmp/task-9-next-dev-lifecycle.lock`, the dynamically bound local Product preview stub, strict local URLs, redacted server logs, exact `tsconfig.json` restoration, verified process-tree exit before cleanup, and `trace: 'off'`. Its desktop and mobile protected previews plus anonymous canonical 404 all passed. Together with the sixteen Editorial cases, the exact serial command executed and passed all 19/19 cases without server or ownership interference. The Product Playwright-equivalent Skill screenshot is `.tmp/product-preview-evidence/agent-browser-skill-playwright-check.png`.

## RED-to-GREEN defects

The E2E/support files were written first. The first RED was the intentionally missing support module. After support implementation, the real environment exposed these defects:

1. Real WordPress Site A Application/Resource preview responses had no cache-control header. A direct protected-source assertion failed, then an exact-inventory Site A-only `rest_post_dispatch` filter added `private, no-store, max-age=0`. Product, generic, and Site B preview behavior is excluded. The Site A A/R cookie-bearing Next redirect was likewise proven RED without `no-store` and fixed only for exact A/R entries.
2. The real Resource Article omitted its comparison table because live unformatted ACF Group children were stored under field keys. The serializer now accepts the exact field-key fallbacks for columns, rows, and cells while preserving the existing formatted-name path.
3. The mobile table had no accessible/focusable scroll region. The renderer now supplies a labelled region and visible narrow-screen hint, with scoped overflow and table minimum width.
4. Independent review reproduced two concurrent Task 9 starts sharing one dist directory, and the losing startup removed the winning server's live output. A cross-process ownership lock now rejects the second start before it can clean anything; a regression proves the active server remains usable. Cleanup verifies `taskkill`/signal success and actual process exit before restoring the exact original `tsconfig.json`, deleting the owned dist, or releasing ownership. Unproven termination fails closed. Failure trace recording is disabled for this signed-preview suite.

No Task 1–8 runtime files beyond those named above were changed.

## Public and cross-site invariants

- Public inventory before/after: `828b8303505d8528918c3eff01792ddd96393e199fd25d103002fd7fadbcc5b8`.
- Inventory version remained `root-only-v0.1`; both `tio2-a` and `tio2-b` remained exactly one `/` route.
- `git diff --quiet` across `app/page.tsx`, `app/sitemap.ts`, Homepage components, `sites/public-routes.ts`, the JSON inventory, and `public/` returned exit 0.
- Homepage source contained zero Application/Resource hrefs.
- Site B invariant before/after remained `sha256:3eae18f5bcc98ae4d2f1ff593c4e7867d9517e6d1654317c610ddef6f4371a58`.
- The final Plan diff from `4b503f3` contained 110 files and zero forbidden-scope files. The only added `placeholder` match was the guard message that placeholders are forbidden. Secret/capability leakage matches were zero (three deterministic `*-secret` strings are test-only fixtures). All private-path/TDS/PDF matches were guards or negative tests; the two synthetic fixtures themselves had zero forbidden-path/private matches. No synthetic business copy appeared in production source.

## Verification

Required/focused commands on the final corrected tree:

- `npm test -- tests/unit/editorial tests/unit/applications tests/unit/resources tests/unit/components/application-page.test.tsx tests/unit/components/resource-page.test.tsx`: exit 0; 8 files passed, 103/103 tests passed.
- `npm test -- tests/infrastructure/application-resource-wordpress-contract.test.ts tests/infrastructure/application-resource-graphql-schema-contract.test.ts tests/infrastructure/application-route-gating.test.ts tests/infrastructure/resource-route-gating.test.ts tests/infrastructure/site-a-editorial-draft-import-contract.test.ts`: exit 0; 5 files passed, 44/44 tests passed.
- `npm test -- tests/integration/wordpress/application-resource-publication-runtime.test.ts tests/integration/wordpress/application-resource-preview-runtime.test.ts tests/integration/wordpress/application-resource-webhook-runtime.test.ts tests/integration/wordpress/site-a-editorial-draft-import-runtime.test.ts tests/integration/wordpress/site-a-editorial-audit-runtime.test.ts tests/integration/api/application-resource-preview.test.ts tests/integration/api/application-resource-revalidation.test.ts`: exit 0; 4 files passed and 3 environment-gated files skipped; 23 tests passed and 21 skipped.
- `npm test -- tests/integration/wordpress/site-a-editorial-live-adapter-runtime.test.ts`: exit 0; 1 file and 1/1 test passed.
- `WORDPRESS_APPLICATION_RESOURCE_PREVIEW_RUNTIME=1 npm test -- tests/integration/wordpress/application-resource-preview-runtime.test.ts`: exit 0; 1 file and 9/9 tests passed against real WordPress.
- `npm test -- tests/integration/api/application-resource-preview.test.ts tests/integration/api/product-preview.test.ts`: exit 0; 2 files and 23/23 tests passed, proving the scoped redirect change did not regress Product preview.
- `npm run typecheck`: passed (`tsc --noEmit`, exit 0).
- `npx eslint app/api/preview/route.ts tests/integration/api/application-resource-preview.test.ts tests/e2e/site-a-editorial-preview.spec.ts tests/e2e/support/editorial-preview-source.ts components/resources/comparison-table.tsx`: exit 0 with no output.
- Three local-container `php -l` commands for `includes/preview.php`, `includes/application-resource-preview.php`, and `tio2-site-model.php`: each exit 0 with no syntax error.
- `npm run test:e2e -- tests/e2e/site-a-editorial-preview.spec.ts`: exit 0; 16/16 passed (ten protected view/viewport cases, five anonymous 404 cases, one concurrent-start isolation case).
- `pwsh -NoProfile -File ./scripts/audit-site-a-editorial.ps1 -RelationshipMode DeferredProductRelations ...`: exit 0; 39 records, 39 deferred edges, and all expected hashes.

Final required commands and sole external gate:

- `npm run lint`: exit 0. Fix Round 1 removed all 22 branch-owned Task 1 `no-explicit-any` violations with typed mutable fixtures and narrow `unknown`/record boundaries; the four affected files independently passed 39/39 focused tests before the full lint run.
- Configured local Site A `npm run build` with task-specific dist: exit 1 after successful compilation and successful Next TypeScript phase. It reproduced the unchanged `/sitemap.xml` Homepage gate: `SitemapIntegrityError`, `reason: source-invalid`, `path: /`. No Homepage, sitemap, inventory, or local data was changed to bypass it, and the generated dist plus temporary `tsconfig.json` entries were removed.
- Exact combined `npm run test:e2e -- tests/e2e/site-a-editorial-preview.spec.ts tests/e2e/site-a-product-preview.spec.ts`: exit 0; 19/19 passed serially from current source (16 Editorial and 3 Product). The Product suite no longer depends on `.next-tio2-a` or any stale production artifact.

An optional default `npm test` sweep produced 1,232 passes, 36 environment-gated skips, and two five-second timeouts under 100-file parallel load. Both timed-out files were rerun independently and passed: the Task 8 path-boundary file passed 7/7 and the unrelated seed-contract file passed 43/43. No implementation change was justified by those load-sensitive timeouts.

## Review and cleanup

Independent review initially reported concurrency/cleanup ownership, `tsconfig.json` restoration, cookie-bearing redirect cache control, WordPress scope, retained signed traces, and report completeness. The verified findings were resolved through the RED cases above. Final rereview reported no Critical or Important finding.

Final cleanup checks showed:

- no `.next-task-9-editorial`, `.next-task-9-product`, or `.next-task-9-build` directory;
- no `.tmp/task-9-next-dev-lifecycle.lock`, `.tmp/task-9-editorial-preview.lock`, or `.tmp/task-9-product-preview.lock`;
- no matching worktree `next dev` process;
- no `wordpress/seed/.runtime-site-a-editorial*` or `.runtime-task8*` file;
- tracked `tsconfig.json` byte content restored with no diff;
- only the requested ignored screenshot evidence remains under `.tmp/task-9-editorial-preview-evidence` and `.tmp/product-preview-evidence`.

## Fix Round 1 evidence

The two Important review findings were branch issues and are resolved:

1. A test-only `MutableFixture<T>` widens literal primitives while preserving nested structure, and a narrow record helper supports deliberate strict-schema unknown-field cases. All 22 explicit-`any` casts in the four Task 1 editorial tests were removed without changing any negative mutation or expected rejection. The four files passed 39/39 tests; focused ESLint, full `npm run lint`, and `npm run typecheck` all exited 0.
2. Generic owned fresh-Next support was factored into `tests/e2e/support/owned-next-dev.ts` and reused by Editorial and Product. Product received its own dynamic loopback port, dist, ownership lock, exact cleanup/restoration, server-error correlation, and Playwright-equivalent Skill check. The first fresh-development REDs showed that Next development mode deliberately returns `no-cache, must-revalidate` for the rendered document and omits the production-only `Secure` cookie attribute; the assertions now require the safe development cache form, no cache hit, and the binding brief's exact-path HttpOnly/SameSite cookie properties. No production runtime defect or production file change was justified.

Fresh final evidence after these fixes: the exact focused test groups passed 103/103, 44/44, and 23/23 with 21 environment-gated skips; live adapter 1/1, real WordPress preview 9/9, and scoped API regressions 23/23 passed; typecheck and full lint exited 0; exact combined E2E passed 19/19; the read-only audit returned 28 Applications, 11 Resources, 39 deferred Product edges, and the same five aggregate hashes; raw fixture/Product/public-inventory hashes remained byte-identical. The configured build again compiled and completed TypeScript before stopping only at the unchanged Homepage `/sitemap.xml` `source-invalid` gate.

The only remaining external gate is the unchanged Homepage sitemap source-invalid build condition. The two original Fix Round 1 items are resolved; the shared-lock issue identified by the Fix Round 1 rereview is addressed below. Real content integration has not started.

## Fix Round 2 evidence

Fix Round 1 retained separate Editorial and Product ownership locks while both lifecycle instances snapshot, permit Next to mutate, and restore the same tracked `tsconfig.json`. The cross-ID regression was written first and produced the required RED: with an Editorial owner active, a Product contender started successfully instead of being rejected. A second RED proved that a manually staged unverified global-lock file was ignored. Both RED runs performed their own cleanup and returned the tracked file to its original bytes.

The generic helper now acquires `.tmp/task-9-next-dev-lifecycle.lock` with exclusive `wx` creation before either the runtime-specific lock or any `tsconfig.json` snapshot. That shared ownership remains held through server startup, runtime use, verified process-tree exit, exact tracked-file restoration, and owned-dist deletion. It is released last, after the runtime-specific lock. A process-stop, restoration, or dist-cleanup failure retains the locks and fails closed. Existing lock files are never reclaimed and their recorded PID is never used to kill a process, so an unverified or stale lock remains untouched for explicit investigation.

`tests/e2e/owned-next-dev-lifecycle.spec.ts` exercises the real helper and fresh Next processes. GREEN proves a Product contender is rejected with `A Task 9 owned Next dev lifecycle is already active` before Product creates its dist or instance lock; the Editorial owner's generated `tsconfig.json` bytes remain unchanged and its `/robots.txt` stays usable; owner teardown restores the exact original bytes and removes all owned artifacts; and Product can acquire ownership afterward. The separate stale-lock case proves the unverified file, tracked bytes, Product dist, and Product instance lock remain untouched. The new suite passed 2/2.

Fresh Fix Round 2 verification: the exact combined Editorial/Product command passed 19/19 serial current-source cases; the cross-ID/stale-lock suite passed 2/2; full lint exited 0 without warnings; typecheck exited 0; and the final read-only audit again returned 39 records (28 Applications plus 11 Resources), 39 deferred Product edges, and byte-identical Application, Resource, readback, deferred-edge, Site B, and raw manifest hashes. No production runtime, content, Homepage, sitemap, public inventory, WordPress data, Apply path, or release surface changed.
