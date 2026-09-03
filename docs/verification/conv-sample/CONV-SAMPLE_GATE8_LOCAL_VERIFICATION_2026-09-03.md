# CONV-SAMPLE Gate 8 Local Verification — 2026-09-03

## Status and boundary

- Page: `CONV-SAMPLE` at `/request-sample/`
- Site scope: `tio2-my`
- Package: `CONV-SAMPLE-G7-HANDOFF-01`
- Result: local Gate 8 implementation and production-build verification complete; ready for Gate 9 read-only QA.
- This record is not a deployment, publication, indexing authorization, Gate 9 PASS, or Gate 10 approval.

## Implemented contract

- One private, scope-bound WordPress singleton and a non-null GraphQL JSON field; missing, duplicate, wrong-scope, wrong-path, or contract-drift records fail closed.
- Next.js server route, DTO validation, cache tags, webhook/revalidation route, Metadata API output, and JSON-LD are isolated to `site_scope=tio2-my` with no cross-scope fallback.
- Buyer-clean page uses the shared `MalaysiaGlobalHeader` / Mobile Menu / Footer and passes only `currentPageId="CONV-SAMPLE"` and `sourcePageId="CONV-SAMPLE"`. Because Request a Sample is not a first-level navigation item, no navigation link receives `aria-current`.
- Exact 14-grade plus unknown-grade selector, eight application choices, conditional Other field, destination text input, document selections, privacy notice, human-review sequence, and four FAQ answers are server-rendered.
- Prefill provenance is restricted to explicit registered Malaysia Product/Grade/Process/Application/Market/Resource Page IDs, exact source/value mappings, the 30 approved Grade/Application relations, and the 8/5/1 process classification. Invalid, missing, stale, mismatched, `Other`, or `Not sure` prefill values clear neutrally. `M-2377 → Specialty Materials` and non-sulfate M-2377 process prefill are discarded; independently buyer-entered choices remain available for human review without creating a public relation.
- Registered Market Page IDs map to approved buyer-visible Destination labels. Resource context is accepted only for the currently approved public `RES-ORIGIN` mapping and is shown as `Alternative-origin sourcing considerations`; internal Page IDs are never displayed.
- Browser input is not silently truncated. Client and server validate Unicode code-point limits; the 2,001-character evidence retains the entered value and focuses the linked error summary.
- Only `{ok:true, receipt_confirmed:true}` from the receiver enters success. Network/server/ambiguous failure retains buyer values and performs a real retry with the same idempotency key; a material edit rotates the key. A known unavailable receiver replaces all usable form controls with the approved unavailable panel.
- Receiver canonical/framework origin (without trusting client-supplied forwarding headers), JSON content type, 32 KiB bounded body, UUID, scope/page/workflow injection, server-owned destination, timeout, and acknowledgement contract are enforced at the same-origin API boundary. A full worst-case valid Unicode payload is covered.

## SEO, GEO, Schema, and crawler controls

- Title: `Request a Titanium Dioxide Sample | TiO2 Malaysia`
- Meta description: `Request a Malaysia-origin titanium dioxide sample for technical evaluation by sharing the grade, application, destination and test objective for human review.`
- Canonical: exactly one `https://tio2malaysia.com/request-sample/`, with no query/hash and no cross-scope host.
- Robots: `noindex, nofollow`; no hreflang.
- Sitemap: `/request-sample/` remains absent before release/indexing authorization.
- JSON-LD: one graph containing only `WebPage` and `BreadcrumbList`; no `FAQPage`, `Product`, `Offer`, form values, query values, or personal data.

## Fresh command evidence

All commands ran in `D:\16Wordpress_nextjs\.worktrees\home-001-tio2-my`.

| Check | Command | Result |
|---|---|---|
| GraphQL types | `pnpm codegen` | PASS |
| Unit/integration/infrastructure | `pnpm exec vitest run tests/unit/wordpress/cache-tags.test.ts tests/integration/api/revalidate.test.ts tests/unit/request-sample tests/integration/request-sample tests/infrastructure/tio2-my-request-sample-wordpress.test.ts` | PASS — 13 files, 128 tests |
| PHP singleton syntax | `php -l .../request-sample-v01.php` in PHP 8.3 container | PASS |
| PHP seed syntax | `php -l .../apply-tio2-my-request-sample.php` in PHP 8.3 container | PASS |
| PHP scope runtime | `php tests/infrastructure/php/request-sample-taxonomy-runtime.php` in PHP 8.3 container | PASS |
| Changed TypeScript/JavaScript lint | ESLint over all changed and new `*.ts`, `*.tsx`, and `*.mjs` except generated output | PASS — 0 errors/warnings |
| TypeScript | `pnpm typecheck` | PASS |
| Production build | `SITE_ID=tio2-my NEXT_PUBLIC_SITE_ID=tio2-my NEXT_DIST_DIR=.next-tio2-my pnpm build` | PASS — `/request-sample` and `/api/tio2-my/request-sample` present |
| Production-server browser tests | `pnpm exec playwright test tests/e2e/request-sample.spec.ts --config=playwright.config.ts` | PASS — 13/13 |

## Browser and responsive evidence

- 1440, 768, and 390: exact H1, 11 form field groups, 14 grades plus unknown, eight applications, five document options, complete initial FAQ answer DOM, one canonical, no hreflang, restricted JSON-LD, shared RFQ surfaces, and no visible `CURRENT`.
- Header contract: 84 px at 1440; 64 px at 768 and 390. The production shared SVG has non-zero decoded and rendered dimensions at every primary viewport.
- Axe: zero serious or critical violations at 1440, 768, and 390.
- Overflow: exact document-width parity at 320, 375, 390, 430, 768, 1024, 1280, and 1440.
- Mobile fields and controls: one-column layout and at least 44 px target height at 320/375/430.
- Mobile Menu: focus enters the menu, remains contained while tabbing, Escape closes it, and focus returns to the trigger.

| Evidence | Dimensions | SHA-256 |
|---|---:|---|
| `conv-sample-desktop-1440.png` | 1440×4278 | `C2BCF100172F57454D225C5E2D475774741FAAD9E12C464C1C2C27FB83852DD1` |
| `conv-sample-tablet-768.png` | 768×5378 | `1769F516AD2A0B8CAEBB524ADE9194A6A7DE28ED263E4EED132CF72610E775FE` |
| `conv-sample-mobile-390.png` | 390×5733 | `3B7F0EFA718C1F868810348FBEA0D5E40B30E88136BDD18434ED0541E23B0A6B` |
| `conv-sample-prefill-390.png` | 390×5733 | `7F0AC35BCCC592BB60F0B5EA4C40FEB9FFDE84B6424ADA69CEC26EF8F8DFB3C8` |
| `conv-sample-validation-390.png` | 390×5792 | `E6E97B4703EE6CC5486A0630C005027C33DC7F0A3C5CEB5956627702A9DB4CB3` |
| `conv-sample-failure.png` | 1280×4046 | `F54DA33AFFA3A7E3119B1A6BE3BE2870C2A6C649906E5FF66D41FDADEC969C65` |
| `conv-sample-success.png` | 1280×2406 | `1133929041F16BF63B05DA77D8FA24039ACA299E8FCDCCAEBC81CD2597AC6BC7` |
| `conv-sample-unavailable-390.png` | 390×3117 | `5758D0BA1C1D0C708A16277639A908BE4953B17670AF378AD2276A0C7AB8BE2B` |

All screenshots were freshly generated by the final production-server E2E run and contain no real personal data. Desktop, tablet, mobile, and unavailable evidence were also manually inspected for visible Logo, Chrome, module order, collisions, and state replacement.

## Release blockers retained

1. A production receiver URL/token and operational-owner evidence for durable persistence, deduplication, and positive acknowledgement have not been supplied to this local worktree. The local receiver stub verifies the application contract only; it is not production evidence.
2. The scoped WordPress singleton/seed must be applied and verified in the authorized target environment. No production WordPress write was performed.
3. The Legal/Privacy owner must confirm that the actual production sample-request data flow matches the published Privacy Policy and consent/CMP dependencies.
4. Shared RFQ, upstream source-page readiness, Global Chrome/legal dependencies, and receiver availability require Gate 9 complete-site verification.
5. Gate 9, Gate 10, deployment, publication, DNS, sitemap admission, and indexing authorization remain outstanding. The route stays `noindex, nofollow` and outside the controlled sitemap.
