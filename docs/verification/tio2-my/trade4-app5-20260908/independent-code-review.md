# Independent code review — nine-page editorial Gate 8 candidate

Reviewed: 2026-09-08 09:11 +08:00. Site: `tio2-my`. Worktree: `D:\16Wordpress_nextjs\.worktrees\trade4-app5-gate8`. Branch: `codex/trade4-app5-gate8`. HEAD/base: `fca45f9c8fd940cea7efff1494526d258862191c` plus current uncommitted implementation.

This is a bounded independent technical re-review of changed issues after the earlier code review. It does not repeat the approved-copy/payload audit, certify the final build/browser run, close Gate 9, or authorize publication. The original `.tmp/editorial-code-review.md` remains the initial finding record. `.tmp/editorial-code-recheck.md` was subsequently replaced by the implementation owner's target-readiness report and is not independent closure evidence.

## Review outcome

No open P1/P2 finding remains in this bounded review after the last metadata correction. All earlier findings below are closed at code level; final runtime validation remains separately owned.

### Closed during this pass: [P2] Unavailable breadcrumb destination in JSON-LD

Original location: `lib/seo/editorial-metadata.ts` (`page.breadcrumb.map(...)`), with delivery projection at `lib/wordpress/editorial-v01-dto.ts:56`.

At the start of this pass, APP-INK reported `/applications/` in `unavailableInternalPaths` because no same-scope Applications Hub resolver exists. The sanitizer correctly unwrapped its visible breadcrumb anchor and leaves the neutral Applications label. However, `buildEditorialJsonLd` ignored the same readiness field and still emitted the unavailable URL as the Applications `BreadcrumbList` item. The affected destination therefore remained a machine relation after it was deliberately removed from the visible body. This was active without requiring a new CMS mutation. The same mismatch applies if an affected breadcrumb Home target becomes unavailable.

Authority: `D:/23MySec/pages/applications/printing-inks/04_planning/APP-INK_GATE2_CONTENT_CONTRACT_V0.2.md:79` requires removal of the missing target link/card without a hidden Schema relation; §5 also requires Schema to match eligible routes. Restrict the correction to the existing authorized APP-INK/PAPER readiness policy.

Fix: build breadcrumb machine entries from the validated delivered readiness state, so unavailable destination URLs are not emitted. Keep buyer-visible neutral labels/source copy unchanged; choose a valid BreadcrumbList projection and maintain sequential positions when omitting an affected machine entry. Add a focused assertion for APP-INK with `/applications/` unavailable and confirm its absolute URL is absent from JSON-LD while the body label remains. Keep the existing WebPage/BreadcrumbList type baseline and noindex status.

Resolution independently inspected at 09:11 +08:00: `buildEditorialJsonLd` now filters the delivered breadcrumb list against `page.unavailableInternalPaths` before mapping and assigning sequential positions. The visible body retains neutral labels. The focused regression in `tests/integration/editorial/editorial-queries.test.ts:15` verifies unavailable APP-INK Applications URL suppression and positions `[1,2]`; `tests/e2e/editorial-nine.spec.ts:42` checks actual machine breadcrumbs against unavailable targets. Parent reports 24 query/SEO tests passing; that result is attributed to parent and was not rerun by this reviewer. The fix closes this P2 at code level.

No new P1 finding was identified in the reviewed changes.

## Earlier finding dispositions

| Area | Independent assessment of current code |
|---|---|
| Grade eligibility and atomic action removal | Closed at code level. PHP resolves exact approved same-scope published Product Details, including their required parent readiness. DTO permits only unique Grade paths occurring in the approved body; absent Grade actions are removed while separate neutral Grade name/process table cells remain. All editorial requests use `no-store`, with only request-local React deduplication. No Grade ItemList/Product machine relation is emitted. |
| Non-Grade target eligibility | Closed at code level, including breadcrumb machine parity after the final correction. PHP and TypeScript limit `unavailableInternalPaths` to APP-INK/PAPER. Unknown/non-ready exact internal destinations are unwrapped without creating alternative links or readiness labels. Native fragments and official HTTPS sources are untouched. |
| Trade mandatory destinations | Preserved correctly. All Trade records and other Application records return an empty non-Grade suppression list, and the DTO rejects a nonempty list outside APP-INK/PAPER. Brazil EN/PT destinations remain visible dependencies/release blockers. No broad filtering is allowed to hide them. |
| Editorial font integration | Closed at code level. All nine scoped style files use `--font-my-shared`, including font shorthand and supplemental declarations, and both payload generators retain that adaptation. |
| Actual body margin reset | Closed at code level. The renderer imports the narrowly scoped `body:has([data-editorial-page])` margin reset. Page styles remain under the editorial/main boundary; shared Chrome typography remains its own consumer. |
| Shared menu test correction | Closed as a test-harness defect. Topbar RFQ precedes Close in tab order; the revised test uses normal Tab traversal and tests wrapping at the actual first/last elements. No production shared-menu change was introduced by that fix. |

## Changed security and interaction paths checked

- **Private delivery/auth:** Next reads only the server credential, attaches it to the upstream request, and uses no persistent content transport cache. PHP checks exact `pageId`/`siteScope` and a nonempty constant-time token comparison before returning editorial payloads; the CLI bypass is limited to WP_CLI. The client anchor helper receives only Page ID. No credential or private evidence object is passed into that client component or JSON-LD.
- **Identity and source binding:** PHP requires a unique record with exact CPT/slug/path/page ID, exactly one Malaysia scope, published state and approved payload. TypeScript repeats the scope/path/identity and exact approved payload checks before sanitization. No same-site seed fallback or cross-site fallback was introduced.
- **Freshness wrapper:** PHP and Next validate the trusted exact review record, separate evidence artifact identity, package/policy identity, event state, real calendar dates and the Asia/Kuala_Lumpur clock. No current body/metadata is returned after the review gate rejects. This re-review inspects the changed wrapper, not a fresh full audit of the separately owned review-update operation.
- **Failure handling:** Foreign site configurations are rejected before querying. Recognized editorial contract/freshness/GraphQL errors emit a scoped internal reason and route to no-content 404. Other failures propagate rather than using fallback content. Unexpected DTO cross-scope or transport failures can reach the generic error boundary; this remains fail closed and is not asserted here as an availability pass.
- **Hub synchronization:** The Hub's Trade filtering calls the same editorial gate on each request; the Hub route forces request-time execution. Editorial Trade webhooks include `/resources`, which receives its Hub cache tag invalidation. The source response may be cached, but a Trade relation must pass the current uncached editorial review gate before final projection.
- **Anchor focus fix:** The helper handles only plain primary clicks on local fragment anchors within this page's main; modified clicks are preserved. It now prevents native fragment navigation from stealing focus after the handler, pushes history only for a changed hash, scrolls to the intended section and focuses its heading without a second scroll. Existing page-local IDs and fixed Page IDs prevent foreign-root selection. The scoped focus outline applies to the programmatically focused heading.

## Evidence and limits

This final pass used direct source reads and current diff/identity checks. It did not run CMS mutations, the whole test suite, a build, or browser E2E; the parent is performing the final build/runtime verification. Earlier focused runs in the initial/recheck work were 23/23 and 65/65 respectively, and the shared-menu correction passed its focused 1/1 test plus ESLint; those historical runs are not relabeled as final-build evidence.

The prepared target-readiness E2E/helper are bounded to the disposable local clone and cover M-350/Product Hub Draft and Foreign states with restoration. Their preparation and syntax/collection checks do not by themselves establish that target-state runtime checks passed. Record the parent's actual final execution separately.

The breadcrumb P2 discovered during this pass was sent to the implementation owner promptly. Its fix was then independently read back and closed as recorded above; this technical code review does not replace final runtime or independent planning-side acceptance.


## Reviewed file fingerprints

- lib/seo/editorial-metadata.ts: 1C398865009A9E4B8DC4708AAF758745BE356147F317EF90AFEF2A2A55B196B3
- lib/wordpress/editorial-v01-dto.ts: 9268BE786E3887A5FE4C06170A272AFFC68D999EDD9AD2142A916A236819F7F9
- lib/wordpress/editorial-v01-queries.ts: EA4DEEB14F43CA7E748E47155DE2F8397DD588DA93FEDC510C7DB6207B028469
- lib/editorial/malaysia-editorial-route.tsx: BD5311F5576DD99E9FA32E82426FD44D37ED2A6F14E0DFD72BD5EEC4466E529F
- components/sites/tio2-my/editorial/editorial-anchor-focus.tsx: 12E34D9B840A9373D5A0176413CC2F36511EA649497AC9AE4E31375C5BB84A85
- wordpress/plugins/tio2-site-model/includes/editorial-v01.php: 273E209FB0220087B05DBD457614EF086776A190B6FFA4908CB7998FB4F3CB3C
