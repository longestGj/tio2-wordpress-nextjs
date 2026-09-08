# Five-page final independent code review

Date: 2026-09-08, source review frozen at 10:55:52 +08:00. Site: `tio2-my`, EN; local Gate 8 candidate. Authorization: `G8-DE-IT-SU-R706-CHEMOURS-20260908-01`. Worktree: `D:/16Wordpress_nextjs/.worktrees/de-it-su-r706-chemours-gate8`; branch `codex/de-it-su-r706-chemours-gate8`; HEAD/base `84db14ee35fe118415bff8327f202ee712e7599c` plus the uncommitted implementation.

**Code assessment: no remaining actionable defect found in the reviewed implementation.** This is an independent technical code review, not Gate 9 acceptance, publication approval or a claim that the rebuilt visual candidate has passed. The parent/browser owner must bind its post-fix visual result to the new build; the previous `olH5kVkkyEhmfGAHQ_2SJ` screenshots do not verify the final Cookie/Header correction.

## Review scope and authority

Read AGENTS.md, site registry, development workflow, the five-page implementation plan, `de-it-intake.md`, `sulfate-intake.md`, `alternatives-intake.md`, and `five-core-review.md`. Reviewed the tracked implementation diff and new source/config/routes/builders/tests/seed/probe files, including the final shared Cookie correction. Rechecked the exact B copy for Sulfate and both alternatives, source hash/parity builders for all five pages, and the specific Sulfate package/shared frozen Cookie rules where implementation questions arose. Source inputs were read only; no D23, implementation, CMS or runtime mutation was performed by this reviewer. Only this report was written.

The audited scope covers source-bound DTO/sanitization, PHP private delivery/auth/identity, freshness manifests, metadata/JSON-LD, conditional owner omissions, retained Sulfate Grade actions, shared Chrome consumer isolation, Documents/Sample/RFQ entry data, old/new seed separation, webhook routing and site isolation. Existing CORE-01 through CORE-04 are resolved as documented in `five-core-review.md`; this review found no counterevidence reopening them.

## Findings and disposition

| Finding | Severity | Evidence and implementation location | Disposition |
| --- | --- | --- | --- |
| Cookie heading inherited Footer white text, and the initial Cookie overlay did not provide native modal background isolation. | P2 | Parent discovered the rendering failure. This reviewer opened `evidence/five-browser/olH5kVkkyEhmfGAHQ_2SJ-r1/PRODUCT-PROC-SU-390-cookie.png` and confirmed the blank white heading region. Final `components/sites/tio2-my/malaysia-global-chrome.tsx:252` keeps the old host for other consumers; line 254 emits the five-page host as a Footer sibling. `components/sites/tio2-my/consent/malaysia-cookie-settings.tsx:64` calls `showModal`; line 91 closes/restores overflow on cleanup. | Resolved in reviewed source. New-build visual/focus/background confirmation remains the parent/browser owner's separate evidence. |
| Five-page Cookie visual still inherited the old Arial/uppercase/navy-button styling. | P2 | Reviewer compared the frozen Sulfate HTML `.cookie-layer` and `.cookie-actions` rules with the intermediate native-modal CSS and notified the parent. Final `components/sites/tio2-my/consent/malaysia-cookie-settings.module.css:12`–20 provides scoped Inter, readable heading, approved spacing, teal controls, sentence case, responsive sizing and visible focus. | Resolved in reviewed source; original non-native consumer styles remain intact. New-build visual confirmation is separate. |

The parent also corrected the five-page Header box model at `components/sites/tio2-my/malaysia-global-chrome.module.css:85`: `border-box` makes the declared 84/64px heights include the border. No further source defect was identified in that delta.

## Verified boundaries

- All three deterministic builders pass `--check` against the bound planning inputs. DE/IT retain the complete approved text and receiver arguments; the Trade sentence and application CTA omissions are limited to exact source-marked nodes. The DTO rejects requested suppression outside those markers (`lib/wordpress/editorial-v01-dto.ts:60`).
- Sulfate keeps all five approved Grade actions and schema order even when the availability list is empty (`lib/wordpress/editorial-v01-dto.ts:61`). Missing target readiness remains an explicit dependency rather than rewritten public content.
- Both alternatives retain provisional identity, null canonical and no JSON-LD (`lib/seo/editorial-metadata.ts:20`). Their clean Products/Documents/Sample actions do not inherit competitor context. The shared WebSite reference used by the other pages has a real scoped owner in `wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json:24`.
- New freshness evidence remains separately bound to exact page/package/artifact/control and does not rewrite the frozen public review date. Old nine payloads and their previous metadata policies remain unchanged. Runtime delivery still requires the private token and exact scoped CMS record; no frontend fallback was added.
- Documents preserves the three new source-only attributions through subsequent buyer-entered fields; Italy Sample ignores injected context as required. Generated country RFQ links carry source/country only, and Sulfate RFQ carries source only. Shared Chrome RFQ links remain clean.
- The expanded editorial registry does not expand the historical nine-record seed. The new seed is task-guarded, local, create-only, preflighted and rollback-limited to its newly created IDs. The RFQ update is constrained to the three allowed IDs and exact semantic before/after delta. These are static review conclusions; this reviewer did not execute CMS mutations.
- New shared behavior is selected only by the exact five source IDs at `components/sites/tio2-my/malaysia-global-chrome.tsx:18`. Old consumers keep their dialog/Cookie behavior. The native Cookie host is outside the Footer and remains inside the shared editorial font owner.
- The Sulfate package specifically prohibits a *page-private* font bundle. The shared editorial `next/font/local` asset, licensed with `fonts/Inter-OFL.txt`, is not a page-private Sulfate font. The intake phrase forbidding a freeze TTF copy was a stricter paraphrase, not an additional source requirement.

## Checks executed by this reviewer

1. `node scripts/editorial/build-de-it-payloads.mjs --check`, `node scripts/editorial/build-sulfate-payload.mjs --check`, and `node scripts/editorial/build-alternative-payloads.mjs --check`: all passed.
2. `npx vitest run tests/unit/editorial/five-page-policy.test.ts tests/unit/editorial/five-core-review.test.ts tests/unit/editorial/sulfate-payload.test.ts tests/unit/tio2-my-five-page-chrome.test.tsx tests/integration/editorial/editorial-route-scope.test.tsx tests/integration/editorial/editorial-revalidation.test.ts`: 6 files, 77 passed, 1 skipped at 10:51:49 +08:00. The skipped test was the opt-in actual PHP subprocess; its earlier execution belongs to `five-core-review.md`, not this run.
3. `node --test scripts/editorial/build-de-it-payloads.test.mjs scripts/editorial/build-alternative-payloads.test.mjs`: 4 passed.
4. After the Cookie correction, `npx vitest run tests/unit/legal/consent-manager.test.tsx tests/unit/tio2-my-five-page-chrome.test.tsx`: 2 files, 9 passed at 10:55:17 +08:00.
5. `git diff --check`: passed. Warnings concern Windows line-ending normalization, not whitespace defects.

No new browser, PHP/CMS mutation, full build, deployment, real form submission or external message was executed in this review. Mock receiver results do not prove provider acceptance or mailbox receipt.

## Final source fingerprints

These exact source bytes were read after the parent declared production edits frozen. The eventual parent code/evidence snapshot may supply the complete implementation inventory.

| File | SHA-256 |
| --- | --- |
| `components/sites/tio2-my/malaysia-global-chrome.tsx` | `9a7c689cd8bd660a0cfca2bc011b245441c06e5645febf9cda42528708c0b859` |
| `components/sites/tio2-my/malaysia-global-chrome.module.css` | `05d32c770c19c5cf67e30d659e134499e334bb4651c37b9b1156e243898e4c5f` |
| `components/sites/tio2-my/consent/malaysia-cookie-settings.tsx` | `67b483a4031856b29321393c014cfed2bb1e05b9a9145ccd4a651e1a7cf2b768` |
| `components/sites/tio2-my/consent/malaysia-cookie-settings.module.css` | `dafdb651ff74a15b7e08229212bbf9fb9cbd2800c254b9a43275ad3d7bb63220` |
| `lib/wordpress/editorial-v01-dto.ts` | `a080c17e01d65be65b97ef8e8e045ea40b29c070316ff5bc1a2d05e190fd7a1f` |
| `lib/editorial/malaysia-editorial-contracts.ts` | `3f3a96695f2f7f7f076d183bc7f9d8617fa0064d74ce6e601fdf06d88316af75` |
| `wordpress/plugins/tio2-site-model/includes/editorial-v01.php` | `93e5ca2baa92878187c7b47fce9ed8a9c7f90c14df08af7dc83b44fd0f6f95e8` |

Known limits remain explicit: alternative D01 mapping/schema authority, Applications Hub availability, RFQ provider-key/real-receipt conditions, and native zoom/device/engine/AT coverage. They do not justify unrequested implementation expansion. This report neither closes those dependencies nor grants Gate 9/10 approval.
