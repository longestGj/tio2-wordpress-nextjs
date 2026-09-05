# DOC-REACH-G9-P1-DEP-01 development return

Branch: `codex/doc-reach-gate8-evidence`.
Starting HEAD: `4344bfeea7107699604072bea4b3eefe82a03e83`.
Worktree: `C:\Users\longe\.codex\worktrees\609c\16Wordpress_nextjs`.

The seven named dependency routes and Cookie Settings/CMP now pass integrated runtime checks in the same optimized Next.js build and CMS fixture. Full-site Gate 8 evidence is **not complete**: the shared Applications link still returns 404 for Malaysia and is recorded as an open shared release blocker. This return does not assert Gate 9 approval.

## Cause and repair

The previous fixture supplied REACH and Request Documents directly but forwarded other GraphQL requests to a separately seeded localhost WordPress instance. The Hub and Legal/RFQ records there failed their production contract validation, while REACH readiness independently remained true. The old dependency ledger described eligibility rules without visiting the targets.

The new fixture serves the checked-in approved Malaysia records for all implemented Header/Footer destinations and the specific REACH dependencies. It never forwards to another CMS or scope. Production DTOs, Next routes, metadata, React components, cache and interactions execute normally. Unsupported GraphQL queries return an explicit error. Product child routes outside this fixture remain ineligible rather than being fabricated; Resources uses its approved no-qualified-resource state.

REACH default readiness derives from the available scoped fixture records. The evidence requires actual page HTTP, Canonical, scope and interaction checks in addition to that input. A controlled ineligible dependency also returns a GraphQL error instead of continuing to supply an eligible record. Existing receiver/source transitions still exercise the signed revalidation endpoint.

Playwright now starts the fixture, builds the application and starts that build as one owned workflow. Build and runtime use the same fixture endpoint and a per-run cache namespace. In-run transitions retain normal production cache behavior. This prevents previous runs' cached upstream errors from being mistaken for new fixture responses. The test run uses a synthetic Web3Forms key; requests are intercepted and no external submission is sent.

No production page/component, Gate 7 payload, EG-006 text boundary, SEO/Schema or shared Chrome implementation was changed.

## Reproduction

From this worktree, run:

```powershell
$env:DOC_REACH_BASE_URL='http://localhost:3014'
$env:DOC_REACH_FIXTURE_URL='http://127.0.0.1:4023'
$env:NEXT_DIST_DIR='.next-doc-reach-dep01'
npx playwright test --config=playwright.document-reach.config.ts
```

This starts and stops its own fixture and Next service. Ports 3014/4023 were chosen to leave the controller's 3004/4013 runtime untouched. The config runs `next build` followed by `next start`; no separate manual CMS start or production key is required. Build failure prevents the browser suite from running.

## Observed dependency results

| Dependency | HTTP | Canonical / scope | Interaction |
| --- | --- | --- | --- |
| DOC-000 `/documents/` | 200 | Expected self-Canonical, `tio2-my` | Select M-2196, navigate to CONV-DOC, observe prefilled Grade |
| MARKET-EU-001 `/markets/european-union/` | 200 | Expected self-Canonical, `tio2-my` | Shared RFQ opens the actual RFQ form |
| CONV-DOC `/request-documents/` | 200 | Expected self-Canonical, `tio2-my` | Required-field validation; main suite verifies editable REACH context, Back/Forward, tamper rejection and intercepted receipt |
| CONV-RFQ `/request-a-quote/` | 200 | Expected self-Canonical, `tio2-my` | Validation focus, negative acknowledgement retaining values, retry and positive receipt; intercepted `CONV-RFQ`/`tio2-my` payload |
| Privacy EN `/privacy-policy/` | 200 | Expected self-Canonical, `tio2-my` | Contents link navigates to visible policy section |
| Privacy BM `/ms/privacy-policy/` | 200 | Expected self-Canonical, `tio2-my` | Contents link navigates to visible policy section |
| Cookie Policy `/cookie-policy/` | 200 | Expected self-Canonical, `tio2-my` | Contents link navigates to visible policy section |
| Cookie Settings/CMP on REACH | Host 200 | REACH self-Canonical, `tio2-my` | Dialog opens, traps focus, Escape restores focus, policy link loads real Cookie Policy, no consent storage is written |

The machine ledger records each observed status, final URL, Canonical, scope, H1, interaction and screenshot. It also walks every unique local Header/Footer href: Home, Markets, Products, Documents, Resources, About, RFQ and all three Legal destinations pass; Applications returns 404. Existing destinations also pass shared Mobile Menu opening/Escape/focus-return checks.

## Fresh verification

- Focused unit/integration/infrastructure plus affected Legal and RFQ regression: **44 files, 323 tests PASS**.
- `npm run typecheck`: **exit 0**.
- `npm run lint`: **exit 0, 0 errors**; two unchanged warnings in `docs/prototypes/site-a-resources/build-visual-prototype.mjs` (`renderTakeaways`, `renderComparison`).
- Production build: **PASS**, Next.js 16.3.2, **37/37** generated pages.
- Production-equivalent Playwright: **25/25 PASS in 53.9s**, including nine widths, Axe at 1440/768/390, original state/SEO/Schema/scope/denylist/prefill tests, seven dependencies, CMP and the shared navigation ledger. Final pre-commit rerun: 2026-09-05, 08:20 UTC; 0 skipped, 0 unexpected, 0 flaky.
- Regression proof before the fixture repair: the new dependency suite produced **7 failures / 1 pass**; five named target pages returned 500, and EU-to-RFQ/CMP-to-policy navigation failed. Test-only cache isolation, complete fixture records and synthetic receiver configuration resolved the named failures.

Complete commands, stdout/stderr and exit codes are in `doc-reach-dep01-command-output.txt`. Playwright's full machine result is in `doc-reach-dep01-playwright-results.json`. Expected wrong/missing-scope negative cases emit server errors in the successful E2E log; they do not represent default-state dependency failures.

## Evidence files

- `doc-reach-dependency-ledger.json`: observations for all eight named checks, shared navigation and explicit blocker state.
- `doc-reach-dependency-*.png`: seven actual dependency-page captures and the 390px CMP open state.
- `doc-reach-runtime-matrix.json`, `doc-reach-public-output-scans.json`, and existing viewport/state PNGs: freshly generated by the original REACH suite in this integrated run.
- `doc-reach-dep01-command-output.txt`: complete final check/build/E2E output.
- `doc-reach-dep01-playwright-results.json`: full per-test result with timing and errors.
- `doc-reach-dep01-evidence.sha256`: evidence and changed test/config hashes.

## Open blockers and authority boundary

1. **Shared Applications navigation:** `/applications/` returns 404. `app/applications/page.tsx` currently admits only `tio2-a`; there is no approved Malaysia APP-000 implementation in this branch. Its Header/Footer link remains controlled by the shared owner. Implementing APP-000 or changing the approved shared navigation is outside this DOC-REACH dependency-fixture repair. The ledger explicitly reports `gate8EvidenceComplete=false`; this blocker is not silently accepted as readiness.
2. **Real release environment:** controlled local records and intercepted form replies do not verify production CMS values, approved recipients, mailbox receipt or production privacy/data-flow readiness. Those remain release controls.
3. **Gate 9 and Gate 10:** independent review remains with the controller; deployment, production CMS writes, publication, DNS and indexing were not performed.

## Changed-file boundary

Code changes are confined to `tests/e2e/support/document-reach-cms.mjs`, `tests/e2e/document-reach-dependencies.spec.ts`, `tests/e2e/document-reach.spec.ts` (remove the old descriptive ledger writer), and `playwright.document-reach.config.ts`. Other changes are verification records and generated local evidence. No D23 files were modified. The automatic Next build additions to `tsconfig.json` were removed before commit.
