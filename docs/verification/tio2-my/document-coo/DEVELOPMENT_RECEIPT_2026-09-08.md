# DOC-COO Gate 8 Development Receipt

Date: 2026-09-08 (Asia/Shanghai)

Status: `D16_TECHNICALLY_COMPLETE / READY_FOR_GATE9_WITH_DECLARED_LIMITS`

## 1. Identity and authority

| Field | Recorded value |
|---|---|
| Dispatch | `G8-BR-CL-COO-FOUR-20260908-01` |
| Approved package | `COO-G6-HANDOFF-04`, V0.4 |
| Package SHA-256 | `41a8f87d32b4c27c45192eb35e17049a24a30ad60d0565f23fdeaaa6f1eb9788` |
| Site / page / locale | `tio2-my` / `DOC-COO` / `en` |
| Route | `/documents/certificate-of-origin/` |
| Repository / worktree | `D:/16Wordpress_nextjs` / `D:/16Wordpress_nextjs` |
| Branch | `codex/poland-development` |
| Pre-work HEAD | `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` |
| Final implementation commit | `4ce8ecd121f5c4b7c89747d82d00aaff4a128b55` |
| Implementation range | `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb..4ce8ecd121f5c4b7c89747d82d00aaff4a128b55` |

The exact identity commands were `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD`, and `git status --short --branch`. Before DOC-COO work, the worktree was intentionally dirty with the already authorized serial Poland, `MARKET-BR-EN`, `MARKET-BR-PT`, `PRODUCT-PROC-CL`, shared Malaysia support and D16 process-document changes. DOC-COO did not use or modify the separate `trade4-app5-gate8` worktree. The implementation and all four serial pages were then committed together at `4ce8ecd`; immediately after that commit, `git status --porcelain=v1` returned no paths. The receipt itself is a later documentation-only commit and does not alter the implementation identity.

Gate 9 can reconstruct the delivered implementation with:

```powershell
git cat-file -e 4ce8ecd121f5c4b7c89747d82d00aaff4a128b55^{commit}
git diff --stat c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb 4ce8ecd121f5c4b7c89747d82d00aaff4a128b55
git show --stat --oneline 4ce8ecd121f5c4b7c89747d82d00aaff4a128b55
```

## 2. Implemented contract

- The exact route rejects a non-`tio2-my` runtime before loading content and reads one validated published WordPress singleton through GraphQL.
- The repository fixture and WordPress seed preserve Buyer Clean V0.2, six approved sections, one H1 and the approved evidence records.
- Both request actions target `/request-documents/?document_types%5B%5D=origin_supplier_qualification&source_page_id=DOC-COO`.
- The receiver visibly prefills a removable/editable origin-and-supplier-qualification document choice, keeps `source_page_id` hidden and restores only normalized state on initial load, Back, Forward and direct revisit.
- Metadata, canonical, language, noindex/nofollow and JSON-LD follow the Gate 6 boundary. Page-local JSON-LD emits `WebPage` and `BreadcrumbList`; `WebPage.name` equals the H1 and `isPartOf` points to the shared WebSite ID.
- The page reuses Malaysia Header, Footer, Menu and Cookie owners. No page-local form, product/commercial claim, download promise, issuer claim or alternate-site fallback was added.
- The route is absent from sitemap publication. Signed revalidation uses only the exact DOC-COO content and route tags.

## 3. RED/GREEN trace

Focused suite: `DOC-COO-G9-FOCUSED`.

Initial RED command, run before implementation:

```powershell
npx vitest run tests/unit/request-documents/malaysia-request-documents-prefill.test.ts tests/unit/documents/document-coo-contract.test.tsx tests/integration/documents/document-coo-route.test.tsx
```

Result: exit `1`. The receiver rejected the approved `DOC-COO` context and returned empty/null instead of the origin document prefill; the DOC-COO DTO/component imports did not yet exist. Vitest reported 58 existing tests, 57 passed and 1 failed, with two suites unable to collect because the implementation modules were absent. These failures directly demonstrated the missing `COO-G9-01`, `03`, `04`, `08`, `10`, `11` and `12` behavior.

Final GREEN command:

```powershell
npx vitest run tests/unit/request-documents/malaysia-request-documents-prefill.test.ts tests/unit/documents/document-coo-contract.test.tsx tests/integration/documents/document-coo-route.test.tsx tests/integration/documents/document-coo-queries.test.ts tests/integration/documents/document-coo-revalidate.test.ts tests/infrastructure/tio2-my-document-coo-wordpress.test.ts --maxWorkers=1
```

Result: exit `0`; 6 files and 68 tests passed. The original three RED test paths remained in the GREEN command and their assertions were not weakened.

Test identities at the implementation commit:

| Test path | SHA-256 |
|---|---|
| `tests/unit/request-documents/malaysia-request-documents-prefill.test.ts` | `17d6644f9b9072cd1fb5966fca9288bcea98e6287523ede3b35ccc6e3418dbaf` |
| `tests/unit/documents/document-coo-contract.test.tsx` | `94d436ca6e7a124348104b066ea19b28e1d9104bcec0131f9d67431f0f97b314` |
| `tests/integration/documents/document-coo-route.test.tsx` | `682ccd817bfd45292861a9a59f48731fc210ca11b9810eb9a2405a38b44e1574` |
| `tests/integration/documents/document-coo-queries.test.ts` | `a0eeae337ee6a74798cf2ac8ba4a71c5fc659af2c23d43c46b64da51745d59e1` |
| `tests/integration/documents/document-coo-revalidate.test.ts` | `68bedd754ba071dd1d611fdc7d43e05efeb735596cfb7268c5099ae491937e7a` |
| `tests/infrastructure/tio2-my-document-coo-wordpress.test.ts` | `ea09f25e3060822720314b983dc41358f16626c500c489bf8775006b5ee38a1f` |

## 4. CMS, cache and build evidence

| Evidence | Result |
|---|---|
| Fixture | `tests/fixtures/documents/doc-coo/gate6/DOC-COO_GATE6_PUBLIC_PAYLOAD_V0.4.json` |
| Fixture/config SHA-256 | Both `82c1c20791a7ab9391a73b623b6633a68094e3714cef2cc94d65087641f84ead` |
| Minified GraphQL payload SHA-256 | `dcac6f7b3f3dba14736c0a70b45489d54ee17abd9d51690a052d51757a7cf9db` |
| Local WordPress record | post `18543`, `publish`, `site_scope=tio2-my`, exact public path |
| GraphQL readback | ID `document-coo-18543`; exact site/page/path and approved payload |
| Real-path fail closed | Passed for missing scope, wrong route, mismatched payload and unpublished record; the original record was restored |
| Signed revalidation | event `f8414262-37a7-4e1c-9849-525c61eeb120`, HTTP 200; only `content:tio2-my--document-coo` and `route:tio2-my:/documents/certificate-of-origin` |
| Build | `.next-document-coo-g8`, Build ID `VNjQyPGmNIKlIArsXDx9J`; 44 static pages; exact DOC-COO route present |

Engineering commands and results:

```powershell
npm run typecheck
# PASS: next typegen and tsc --noEmit

npx eslint "app/(en)/documents/certificate-of-origin/page.tsx" "components/sites/tio2-my/documents/document-coo-page.tsx" "lib/seo/document-coo-jsonld.ts" "lib/seo/document-coo-metadata.ts" "lib/wordpress/document-coo-v04-*.ts" "lib/request-documents/malaysia-request-documents-prefill.ts" "tests/unit/documents/document-coo-contract.test.tsx" "tests/integration/documents/document-coo-*.test.ts*" "tests/infrastructure/tio2-my-document-coo-wordpress.test.ts" "tests/e2e/document-coo.spec.ts"
# PASS

$env:SITE_ID='tio2-my'; $env:NEXT_DIST_DIR='.next-document-coo-g8'; npm run build
# PASS: Next.js 16.3.2, 44 static pages
```

The broad repository run that was started during development is not used as acceptance evidence. It was interrupted before a reliable final exit result after the user clarified that full-repository testing was outside this page task. The focused suite, affected shared checks, typecheck, relevant lint, production build and page E2E are the evidence for this handoff.

## 5. Browser, visual and accessibility evidence

Production-equivalent Chromium command:

```powershell
$env:DOC_COO_BASE_URL='http://127.0.0.1:3024'; npx playwright test tests/e2e/document-coo.spec.ts --config=playwright.config.ts
```

Result: 16/16 passed. It covers SSR/head/Schema/denylist, all nine required widths (`1440`, `1280`, `1024`, `900`, `768`, `600`, `430`, `390`, `360`), table-to-record behavior, both request actions, hidden attribution, removable prefill, history/direct revisit, unsupported-value discard, Menu/Cookie states at 768/390, focus/Escape, reduced motion and forced colors. Axe serious/critical violations were zero in every automated state. The first browser pass exposed a 6 px overflow at 600 px; page-scope box sizing was corrected and the complete 16-test set was rerun successfully.

Fresh full-page captures:

- `docs/verification/tio2-my/document-coo/runtime/document-coo-1440.png`: actual 1440x4315 vs frozen 1440x4371; normalized similarity `0.9867`.
- `docs/verification/tio2-my/document-coo/runtime/document-coo-768.png`: actual 768x5336 vs frozen 768x5257; normalized similarity `0.9696`.
- `docs/verification/tio2-my/document-coo/runtime/document-coo-390.png`: actual 390x6900 vs frozen logical 390x6865; normalized similarity `0.9800`.

All three captures were opened and inspected against the frozen anchors. Gate 9 must still perform its independent visual judgment.

## 6. Gate 9 evidence map

| ID | Gate 8 handoff state |
|---|---|
| `COO-G9-01` | Ready: exact six-section Buyer Clean content, one H1 and module order are covered by contract/SSR and visual evidence. |
| `COO-G9-02` | Implementation ready; fresh RMCD source availability/content review remains a Gate 9/release-owner action. |
| `COO-G9-03` | Ready locally: both actions reach the receiver with the one visible removable document prefill and hidden source only. |
| `COO-G9-04` | Ready in Chromium: initial, remove, Back, Forward, direct revisit and unsupported discard cases passed. |
| `COO-G9-05` | Visual evidence ready at 1440/768/390; independent comparison remains Gate 9. |
| `COO-G9-06` | Ready: nine-width geometry and overflow checks passed after the 600 px correction. |
| `COO-G9-07` | Automated Axe, keyboard focus/Escape, target, reduced-motion and forced-color evidence ready; named real screen-reader/device/non-Chromium coverage remains open. |
| `COO-G9-08` | Ready: repository fixture and exact hash are recorded; no runtime D23 path is used. |
| `COO-G9-09` | Ready locally: actual WordPress path passed missing/wrong/ineligible failure probes without cross-scope content. |
| `COO-G9-10` | Ready: head/JSON-LD/clean-query checks prove exact metadata, noindex/nofollow, allowed graph and shared WebSite relation. |
| `COO-G9-11` | Ready locally: current shared Malaysia Chrome/legal/consent owners are reused without a page fork. |
| `COO-G9-12` | Ready: route, query, cache, receiver context and negative site/scope paths stay bound to `tio2-my`. |
| `COO-G9-13` | Receiver integration is ready without a live send; provider/mailbox/production configuration remains owned by CONV-DOC and release operations. |
| `COO-G9-14` | Exact official URLs and labels passed DOM checks; fresh external-source review remains open. |
| `COO-G9-15` | Ready: this receipt binds pre-work identity, RED/GREEN test identity, focused checks, final implementation commit and clean post-commit status. |

## 7. Declared limits and next-stage boundary

No real form was sent. No production WordPress write, Preview/Production deployment, DNS change, sitemap addition or indexing activation was performed or authorized. `verify:root-only` was not run. Fresh RMCD source review, production receiver/provider/mailbox evidence, named non-Chromium/real-device/screen-reader evidence and independent Gate 9 visual/content judgment remain open.

This receipt submits Gate 8 evidence for Gate 9 intake. It does not claim `GATE9_PASS`, content reapproval, release authorization, deployment or publication.
