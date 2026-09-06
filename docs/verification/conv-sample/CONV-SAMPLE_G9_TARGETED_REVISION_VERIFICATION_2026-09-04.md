# CONV-SAMPLE Gate 9 Targeted Revision Verification — 2026-09-04

## Control and boundary

- Review ID: `CONV-SAMPLE-G9-PCR-01`
- Page: `CONV-SAMPLE` / `/request-sample/`
- Site scope: `tio2-my`
- Result: the four returned implementation findings were corrected locally and are ready for a fresh read-only Gate 9 review.
- This record is not deployment, publication, indexing, Gate 9 approval, or Gate 10 authorization.

## Corrected findings

### `SAMPLE-G9-P1-01` — initial known unavailability

- The server computes one non-secret `receiverReady` boolean from the Malaysia-only receiver URL and token configuration and passes only that boolean into the page tree.
- If either configuration input is absent or blank, initial server rendering emits the exact approved unavailable heading/body and no `<form>`, sample field, submit action, prefill controls, receiver URL, or receiver token.
- If readiness changes during a submission, the existing 503 unavailable state still replaces controls. Network/ambiguous failure still retains all entries and direct retry still reuses the same idempotency key.

### `SAMPLE-G9-P1-02` — Privacy Policy target

- At `900px` and below, the form's actual Privacy Policy anchor is an inline-flex target with a minimum width and height of `44px`.
- Browser assertions pass at `768`, `430`, `390`, `375`, and `320px`; surrounding paragraph padding is not counted as the target.

### `SAMPLE-G9-P2-01` — FAQ disclosure semantics

- Each FAQ uses a native button with deterministic `id`, accurate `aria-expanded`, and `aria-controls` linked to a labelled answer region.
- The first answer remains initially expanded. Every answer remains present in server-rendered HTML; closed panels use the native `hidden` state.
- Browser and component tests verify Enter operation, state change, panel visibility, relationship integrity, and focus retention on the trigger.

### `SAMPLE-G9-P2-02` — submitting busy state

- The form exposes `aria-busy="true"` only while its receiver request is in flight and removes the attribute on failure or confirmed success.
- Existing repeat-submission prevention, disabled fieldsets/button, retained values, direct retry, and positive-acknowledgement-only success behavior remain intact.

## Test-driven evidence

- Red phase: the new component/SSR tests produced four expected failures covering initial fail-closed rendering, FAQ button semantics, and form busy state before production code was changed.
- Green focused phase: `2` files, `14` tests passed.

## Fresh verification commands

| Check | Command | Result |
|---|---|---|
| Focused component + SSR | `pnpm exec vitest run tests/unit/request-sample/malaysia-request-sample-template.test.tsx tests/integration/request-sample/route.test.tsx` | PASS — 2 files, 14 tests |
| CONV-SAMPLE regression and isolation | `pnpm exec vitest run tests/unit/wordpress/cache-tags.test.ts tests/integration/api/revalidate.test.ts tests/unit/request-sample tests/integration/request-sample tests/infrastructure/tio2-my-request-sample-wordpress.test.ts` | PASS — 13 files, 133 tests |
| TypeScript | `pnpm typecheck` | PASS |
| Changed-file ESLint | `pnpm exec eslint ...changed TypeScript files...` | PASS — 0 errors/warnings |
| Production build | `SITE_ID=tio2-my pnpm build` | PASS — `/request-sample` and `/api/tio2-my/request-sample` present |
| Configured-receiver production browser run | `pnpm exec playwright test --config=playwright.config.ts tests/e2e/request-sample.spec.ts` | PASS — 14 passed, 1 environment-specific test skipped |
| Missing-receiver production browser run | `EXPECT_SAMPLE_INITIAL_UNAVAILABLE=1 pnpm exec playwright test --config=playwright.config.ts tests/e2e/request-sample.spec.ts --grep "initial GET fails closed"` | PASS — 1 passed |
| Diff hygiene | `git diff --check` | PASS |

The browser runtime used the repository's scoped CONV-SAMPLE CMS fixture. Receiver configuration in the configured run was a non-production placeholder and all receiver calls were intercepted by the test; it is not production receiver evidence.

## Browser and responsive results

- `1440`, `768`, and `390px`: H1, module order, shared Chrome, production logo, RFQ surfaces, metadata/Schema restrictions, zero serious/critical Axe violations, and exact document-width parity passed.
- `1280`, `1024`, `430`, `375`, and `320px`: no page-level horizontal overflow passed.
- `768`, `430`, `390`, `375`, and `320px`: the form Privacy Policy anchor itself is at least `44 × 44` logical pixels.
- `390px`: FAQ Enter operation, `aria-expanded`, `aria-controls`, labelled panel, focus retention, and initial known-unavailable replacement passed.
- In-flight retry evidence verifies `aria-busy=true`; both unconfirmed completion and confirmed success restore the non-busy state.

## Fresh screenshot ledger

| Evidence | Dimensions | SHA-256 |
|---|---:|---|
| `conv-sample-desktop-1440.png` | 1440×4278 | `B07F1C8433ABD7945CB93BEA4F0573C577641670AC353D4E7D7F6BB73CFD45A9` |
| `conv-sample-tablet-768.png` | 768×5405 | `B07AFA5EB157F33CE66225334C69193F9724F4F2B6FCF6EF2E3E8E63A44BA03D` |
| `conv-sample-mobile-390.png` | 390×5760 | `CDC0795AFB6466DFA344CDD22D3C8FCEBA2E0CDB215E8DF87EBCB98706709F7A` |
| `conv-sample-initial-unavailable-390.png` | 390×2883 | `F364594541586D4735E43AE82DD6EDBEDD50EB4369FBBE32196D79781A71E910` |
| `conv-sample-prefill-390.png` | 390×5760 | `E7EDBCE672AD5167E6D891829E983BC276F31FB47F4AF20227F9465B187FFCD3` |
| `conv-sample-validation-390.png` | 390×5819 | `0526E05C3446FE66059C5E700C9B7D6A1C178AE3527F8350689FD6FCB4D99693` |
| `conv-sample-failure.png` | 1280×4046 | `37E9EB4C3C08AECCF638976FD5EF445406654536CD5913F7B173DD41B8523B0D` |
| `conv-sample-success.png` | 1280×2406 | `DCF5F599BCC0A49F900F558E0ED27EB5FA0329EBD6AD8103A1BDDA4DB8EFC050` |
| `conv-sample-unavailable-390.png` | 390×3117 | `93FCCA08789C21BCB1217FF13FCDAE79F6471AE93EDE987D1DA8A5DC3AD92587` |

The fresh Desktop, Tablet, Mobile, and initial-unavailable screenshots were manually inspected. Module order, shared Header/Footer/logo/RFQ, form composition, FAQ disclosure visuals, and unavailable replacement are visible without collision or horizontal clipping.

## Preserved contracts and release blockers

- Approved page copy, field set/order, product relationships, metadata, JSON-LD, no-promise rules, shared Global Chrome, and `site_scope=tio2-my` query/route/cache boundaries are unchanged.
- No cross-scope fallback, Contact fallback, FAQPage/Product/Offer Schema, receiver secret, query value, or personal data was added to rendered output.
- Production receiver/persistence/deduplication/positive-acknowledgement evidence remains outstanding.
- The scoped WordPress singleton/seed still requires application and verification in the separately authorized target environment.
- Legal/Privacy data-flow parity, shared RFQ/upstream/shared dependency readiness, Gate 9 approval, and explicit Gate 10 authorization remain release controls.
- No deployment, publication, DNS, sitemap admission, or indexing action was performed.
