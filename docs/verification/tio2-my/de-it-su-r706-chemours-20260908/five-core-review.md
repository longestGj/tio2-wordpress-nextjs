# Five-page common-core independent review

Review date: 2026-09-08, completed checks at 10:48 Asia/Shanghai (same UTC offset as the evidence policy's Asia/Kuala_Lumpur). Site: `tio2-my`; local Gate 8 only. Worktree: `D:/16Wordpress_nextjs/.worktrees/de-it-su-r706-chemours-gate8`; branch `codex/de-it-su-r706-chemours-gate8`; base `84db14ee35fe118415bff8327f202ee712e7599c` plus the reviewed uncommitted changes. Authority: `G8-DE-IT-SU-R706-CHEMOURS-20260908-01` and `D:/23MySec/docs/architecture/GATE8_DE_IT_SU_R706_CHEMOURS_AUTHORIZATION_AND_DISPATCH_V1.0.md`.

Scope: types/registry, common rendering and metadata, exact CMS DTO and PHP delivery, freshness trust manifests, conditional target and Grade policies, query/cache/webhook consumers, three conversion entry paths, the new five-record seed and RFQ source allowlist update. Read against `docs/plans/2026-09-08-de-it-su-r706-chemours-gate8.md`, this directory's `intake.json`, `de-it-intake.md`, `sulfate-intake.md`, `alternatives-intake.md`, and the previously audited approved source chains. This reviewer wrote only the independent test/report in this review turn and did not mutate implementation or CMS.

## Findings and disposition

No actionable common-core finding remains open in the reviewed snapshot. The following concrete regressions were reproduced, sent to the implementation owner and verified after correction:

| ID | Severity | Trigger and observed impact | Resolution and evidence |
| --- | --- | --- | --- |
| CORE-01 | P1 | Exact approved DE/IT bodies contain `aside`; the shared DTO sanitizer rejected that element, so valid CMS pages could not render. Both independent conditional-target tests and the existing query integration cases failed with the body-tag contract error. | Owner added the approved semantic element to the sanitizer allowlist. Both real payloads now pass DTO/query tests, including conditional omission. |
| CORE-02 | P2 | Documents form re-normalized source attribution against buyer-entered fields at submission. The source-only Sulfate entry lost `source_page_id` after the required Grade selection; DE/IT lost it for independently typed application text. Mocked receiver payloads reproduced all three losses. | Exact three source IDs now retain provenance independently of buyer selection. Entry parsing is separately neutral: added URL Grade/application/document types/market/additional text is ignored for these source-only consumers. Independent tests cover both parameter names and subsequent buyer input in transmitted mock payloads. |
| CORE-03 | P2 | The generic Product webhook guard rejected the valid `tio2-my` Sulfate editorial path before reaching its scoped cache tag. Existing editorial revalidation integration returned HTTP 400 for this page. | Guard now admits only the exact Malaysia `PRODUCT-PROC-SU` identity in this exception. All 14 editorial revalidation cases pass; the exception does not admit another site's Product path. |
| CORE-04 | P2 | Owner's additional consumer audit found that the historical nine-record seed iterated the now-expanded runtime registry, which could extend an old task's write scope to five new records. | Owner pinned the historical seed to its original nine IDs. Independent parser regression now checks separate literal nine/five write sets and distinct exact task IDs; no expandable runtime registry is used for either seed's write selection. |

## Verified policy and implementation boundaries

- The old nine approved JSON contracts compare equal to `git show 84db14e:<path>` as parsed content. Their canonical values and default WebPage/BreadcrumbList output remain unchanged. The old four-page review manifest remains separate from the two alternatives manifest.
- DE/IT unavailable-target treatment is limited to source-marked conditional nodes. A missing Trade target removes the complete approved sentence and preserves the general customs sentence and EU Procurement Overview. A request to suppress required Products or EU Overview fails. Required alternatives owner links do not inherit APP-INK/PAPER's broader omission behavior.
- Sulfate retains its approved five Grade actions and ordered CollectionPage/BreadcrumbList/ItemList policy. Missing Grade availability remains an explicit dependency; it does not silently rewrite this page into a shorter product list. The common DTO exception is selected by the exact page ID.
- Alternatives have null canonical and `schemaType: none`; metadata emits no canonical and route rendering emits no JSON-LD. Site-scope mismatch fails before output. The frozen visible review date remains 2026-09-06; evidence is independently dated 2026-09-08.
- Both TypeScript and actual PHP choose the alternatives trust manifest only for `RES-R706`/`RES-CHEMOURS`. Checks require the exact page/package/artifact/policy/control, reject changed status, open event, changed evidence or package hash, unauthorized due date and extra control fields. TypeScript also tests future evidence and the crossed old Trade proof. Alternatives are valid immediately before 2026-12-06 midnight Kuala Lumpur and invalid at that midnight. PHP probes independently confirm valid new/old records and mutation/expiry rejection.
- Evidence bytes match `alternatives-freshness.md` SHA-256 `3b0559416055d44ea15dbf0bea8db5b911e44767eaa0e0d1373e7a5fe895b8e1`. Its bounded official-source outcome and access limits remain explicit. Runtime trusts the checked-in manifest hash binding; this review separately hashes the local artifact. No later public review date or new product fact is inferred from the check.
- Query delivery retains explicit `tio2-my` scope, private server token, exact CMS payload/identity validation, `no-store`, site-qualified route/content tags, and no foreign-site fallback. The Resource Hub's registry consumer is additionally gated by its approved relation type/mapping and readiness; extending the registry does not add a resource card or public mapping by itself.
- Documents source-only entry and later buyer values have separate semantics, as described in CORE-02. Italy Sample source-only handling retains neutral input. RFQ extends only the exact three approved source IDs; approved generated DE/IT links carry only source and country, Sulfate carries source only. Existing receiver tests remain passing.
- New seed statically requires local WordPress plus the exact new task option, validates all five records/reviews before writes, rejects occupied invalid identities, creates missing records only, and rolls back only IDs created by that run. Existing valid records are not overwritten. RFQ update statically requires exact site/type/path/sole published identity, a semantic baseline match, and a delta restricted to DE/IT/Sulfate source IDs, followed by validation and rollback on failure. These seed/update conclusions are source review, not a claim that this reviewer executed their mutation or rollback paths.

## Executed checks

Final command at 2026-09-08 10:48:11 +08:00:

```powershell
$env:FIVE_REVIEW_PHP_CONTAINER='tio2my5-wordpress-1'
npx vitest run tests/unit/editorial/five-core-review.test.ts tests/integration/editorial/editorial-queries.test.ts tests/integration/editorial/editorial-revalidation.test.ts tests/unit/editorial/editorial-review.test.ts tests/unit/request-documents/malaysia-request-documents-prefill.test.ts tests/unit/request-sample/malaysia-request-sample-prefill.test.ts tests/unit/rfq/malaysia-rfq-prefill.test.ts
```

Result: 7 files, 157 tests passed. The independent file contributes 16 tests, including its opt-in actual PHP probe. `npx eslint tests/unit/editorial/five-core-review.test.ts` also passed.

The PHP subprocess used verified task container `tio2my5-wordpress-1` (`wordpress:php8.3-apache`). Its plugin mount resolves to this worktree and is read-only. Probe code only defines `ABSPATH`, includes the actual freshness helper, reads actual configs and exercises validators at supplied dates; it does not bootstrap WordPress, connect to the database, or write files. Receiver checks use an injected in-process fetcher and `example.invalid`, with no real external submission.

This is independent common-core technical review evidence. It does not claim browser visual acceptance, live owner/Grade availability, seed mutation success, full build completion, Gate 9 independent acceptance, or publication authorization. Those results belong to the owner's separately bound local runtime and handoff evidence.
