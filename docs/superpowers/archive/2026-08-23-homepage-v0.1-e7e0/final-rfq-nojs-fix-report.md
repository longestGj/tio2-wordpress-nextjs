# Final RFQ no-JS/privacy fix report

## Handoff

- Mode: Implement
- Proposal ID: `homepage-v0.1`
- Approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Accepted scope: the approved local-only RFQ contract and the final Audit's Critical no-JS/privacy finding; no field, DTO, layout, migration, Product, global-shell, SEO, deployment, or remote changes

## Root cause and decision

The server-rendered RFQ emitted a `noValidate` form with named PII controls but no `action` or `method`. Before hydration, or with JavaScript disabled, those controls and the submit button remained usable. Native browser submission therefore used GET against the current URL and serialized the RFQ values into the URL, browser history, and a server request.

The minimum fix wraps all RFQ controls and the submit button in a disabled fieldset for SSR and the initial client render. A hydration effect enables the fieldset on the next event-loop turn. Server and initial client markup agree, so the fix does not create a hydration mismatch. No action/method workaround, endpoint, storage, cookie, or new user-facing claim was added.

## TDD evidence

### RED

- `npx vitest run tests/unit/homepage/rfq-form.test.tsx --configLoader runner`
  - Exit 1.
  - 12 existing tests passed; 2 new tests failed because no fieldset existed in SSR or hydrated output.
- Real Playwright against the committed `e3b9f89` Site A/Site B production builds, with `javaScriptEnabled: false`, using both Enter and click:
  - Both tests failed for the intended behavior.
  - The controls were enabled and no disabled fieldset existed.
  - Site A navigated from `http://localhost:3001/` to a GET URL containing `name=NO_JS_RFQ_PII_*` and `workEmail=NO_JS_RFQ_PII_*%40example.test`; Site B behaved identically on port 3002.
  - `history.length` changed from 2 to 3.
  - The observed post-load request list contained the PII-bearing document URL.

### GREEN

- `npm test -- tests/unit/homepage/rfq-form.test.tsx tests/integration/homepage/rfq-side-effects.test.tsx`
  - Exit 0; 2 files and 15 tests passed.
  - Covers SSR-disabled controls, hydration enablement, existing keyboard/focus/validation/reset behavior, and zero fetch/storage/cookie side effects.
- `npm test`
  - Exit 0; 39 files passed, 2 skipped; 374 tests passed, 2 skipped.
- `npm run typecheck`
  - Exit 0.
- `npm run lint`
  - Exit 0.
- `npm run test:e2e -- tests/e2e/homepage.spec.ts --grep "remains inert without JavaScript" --list`
  - Exit 0; both Site A and Site B real no-JS tests are discovered.
- `next build --webpack --experimental-build-mode compile` with the existing per-site local environment
  - Exit 0 for both `tio2-a` and `tio2-b`; both current-source production bundles compiled.
- Real Playwright against those current-source bundles with the existing complete homepage GraphQL fixture served by a temporary loopback-only read-only test server:
  - `npx playwright test --config=.tmp/playwright.chrome.config.ts homepage.spec.ts --grep "RFQ (remains inert|restores local-only)"`
  - Exit 0; 4 tests passed.
  - Site A and Site B no-JS Enter/click attempts left every control disabled, did not edit values, and left URL, query, history, and post-load requests unchanged.
  - Site A and Site B hydration regressions proved the controls re-enable, keyboard submission reaches the local success state, fields clear, and no request/navigation occurs.

## Remaining verification concern

The complete normal two-site build and complete homepage E2E suite remain pending in the original D environment. In the mirrored C worktree, Turbopack rejects remaining dependency junctions outside its hermetic workspace root. Webpack compiles the application but its normal post-compile route-type generation reports the pre-existing, out-of-scope `normalizeRoutePath` export in `app/[...path]/page.ts`; compile mode succeeds. The local WordPress service is also unavailable in C, so the full content/visual/axe acceptance matrix could not run against live seeded data. Exact rerun after applying this patch in D: `npm run build` for both configured site environments, start the existing local sites, then `npm run test:e2e -- tests/e2e/homepage.spec.ts`.

## Files and interfaces affected

- `components/homepage/rfq-form.tsx`: hydration gate and disabled fieldset
- `components/homepage/homepage.module.css`: fieldset layout reset preserving the existing form grid
- `tests/unit/homepage/rfq-form.test.tsx`: SSR disabled and hydration-enabled regressions
- `tests/e2e/homepage.spec.ts`: real Site A/Site B no-JS Enter/click privacy regression
- `final-rfq-nojs-fix-report.md`: this evidence report

No public TypeScript interface, DTO, WordPress field, network endpoint, persistence mechanism, or migration changed.

## Unresolved decisions and migration impact

- Unresolved decisions: none.
- Migration impact: none.
- External actions: none.
