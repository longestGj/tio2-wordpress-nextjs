# Runtime Task 8 report: transactional local editorial draft import

## Summary

Implemented Task 8 only:

- local-only, literal-path PowerShell Plan/Apply and read-only audit wrappers for the three required manifests;
- three separately named GUID runtime snapshots with source-before, source-after-copy, staged-copy, and source-at-operation-end SHA-256 checks;
- strict Application, Resource, Product, and combined graph validation against staged bytes before Docker;
- fresh cryptographically random 32-byte one-use capabilities for every Plan, Apply, and audit invocation, with exact allowlisted runtime paths and unconditional cleanup;
- a deterministic normalized Plan whose Apply binding includes the normalized action/current/expected record hashes, all three staged hashes, relationship mode, and the exact deferred Product edge list;
- explicit `Strict` and `DeferredProductRelations` behavior;
- one serializable Apply transaction after preflight, draft-only exact Site A upserts, normalized in-transaction readback, Site B invariance, webhook queue restoration, commit, and rollback on every failure path;
- a read-only normalized audit with per-record, Application, Resource, aggregate readback, deferred-edge, and Site B hashes.

No real Application/Resource copy, Product record, placeholder, published record, deletion, public route, Homepage/navigation/sitemap, `public/`, Site B business content, remote WordPress, deployment, migration, DNS, indexing, controller ledger, or `verify:root-only` surface was changed.

## TDD evidence

Initial RED, before any production file existed:

```text
npm test -- tests/infrastructure/site-a-editorial-draft-import-contract.test.ts tests/integration/wordpress/site-a-editorial-draft-import-runtime.test.ts tests/integration/wordpress/site-a-editorial-audit-runtime.test.ts

Test Files  3 failed (3)
Tests       6 failed (6)
```

All six failures were the expected missing wrapper/importer/exporter boundaries.

Two integration defects were then resolved through separate RED/GREEN cycles:

- PowerShell coerced a Plan capability's null Plan hash to `""`. A wrapper execution test captured both capabilities and failed on the empty value before the parameter type was corrected. It now proves Plan uses `null`, Apply uses the returned 64-hex Plan hash, and both tokens are distinct random 64-hex values.
- unformatted ACF Group readback uses ACF field keys for immediate group children while nested repeater rows retain field names. A pure regression reproduced the exact mixed-key comparison-table shape before the normalizer was added.

The controlled importer test additionally proves 39 deterministic creates, Plan purity, stale Plan-hash rejection, exact installed ACF names, exact deferred-edge ordering, Strict missing/resolved Product boundaries, collision isolation, one Apply transaction, queue restoration, Site B rollback, 39 no-change second Plan actions, and no placeholder/delete/publish path.

## Authorized local Deferred sequence

Inputs:

```text
Application raw SHA-256  ca5b86273f519ac8bd4d54316ff4a953521d55363804a3038205604149ee94c4
Resource raw SHA-256     21d448151c095abc1813272e218331786045f540a519ad0617b56872f310b794
Product raw SHA-256      4e3bf3da49642a6dc01da3c808d784cc2b234cd312c2ab4881a7786dc1afc57c
Product validator hash   3912fd5745ff70221b27df10736bbf6079f32134bafdd52dfb487953ffdfe0c3
```

The user-designated Product manifest existed, passed the strict 25-Product validator, and the combined synthetic graph reported zero unresolved keys.

Final Plan -> Apply -> second Plan -> audit evidence:

```text
Apply-bound Plan SHA-256  01215a85d78b5595d6091a759f15663842ca7224ce08e6bd3a321747b3df1a14
Apply actions              39 create, 0 update, 0 no-change
Second Plan SHA-256        48deb4de7c1143c73b69db421e079b45bad45b767133bfe01ff62b40cdb9636f
Second Plan actions        0 create, 0 update, 39 no-change
Deferred Product edges     39 in both Plans and audit
Audit records              28 Applications + 11 Resources = 39 drafts
```

Every deferred edge has `field: relationships` and `targetProductId: TP-P100`. The exact sources are:

```text
Applications (28): applications-hub, automotive-coatings, coatings, decorative-paper,
decorative-paper-detail, electrophoretic-coating, film-masterbatch, functional-materials,
high-purity, high-pvc-flat-paint, laminated-decorative-paper,
lcp-high-temperature-plastics, marine-aerospace-protective, masterbatch,
mlcc-electronic-ceramics, outdoor-pvc, photovoltaic-white-film, plastics, polycarbonate,
powder-coil-coatings, printing-ink, printing-inks, soft-pvc-solar-backsheet, solar-film,
universal-multi-application, uv-resistant-engineering-plastics, water-based-paint,
waterborne-automotive-coatings

Resources (11): article-01, article-02, article-03, article-04, article-05, article-06,
article-07, article-08, article-09, article-10, resources-hub
```

Normalized audit hashes:

```text
Application SHA-256        sha256:77532810bfe93af4b7497342278122ed1b85d898049a415c579df3b24ba12331
Resource SHA-256           sha256:e70d4ba190404c695f3aa5916c1e11c433b0b0f8c5ce810f7ef96ab110768792
Readback SHA-256           sha256:dceb63a584b223e7857a47bf791bc3db5f4a0059652932bf3d571ca653639315
Deferred-edge SHA-256      sha256:e04c77af8f66774c09b443f691faf25840afe42b5ca8920006d3a505245a7c03
Site B invariant SHA-256   sha256:3eae18f5bcc98ae4d2f1ff593c4e7867d9517e6d1654317c610ddef6f4371a58
```

The audit compared the Site B snapshot before and after its read and rejected any difference. The Apply path snapshots Site B before mutation and asserts the same hash before commit and after rollback.

## Rollback evidence

- The controlled injected mid-Apply failure rolled back all created identities/content, restored the original webhook queue, restored the synthetic Site B state, recorded exactly one rollback, and recorded zero commits.
- During local integration, an initial wrong ACF-name attempt and a later comparison-table readback mismatch both failed inside the Apply transaction. A following fresh Plan still reported all 39 records as `create`, proving neither failed attempt committed an identity or partial record.
- The successful Apply committed only after all 39 normalized readbacks matched.

## Verification

Final focused and regression command:

```text
Test Files  7 passed | 2 skipped (9)
Tests       22 passed | 17 skipped (39)
```

This included the three Task 8 files, all three proven Product importer/audit files, and the Application/Resource WordPress contract, publication, and preview regressions. The skipped tests are their existing environment gates.

- `npm run typecheck`: passed.
- Scoped ESLint over the three Task 8 TypeScript test files: passed with no output.
- PHP lint for both Task 8 entry points in the local `wpcli` container: passed.
- `git diff --check`: passed.
- Runtime-stage/capability cleanup: zero `.runtime-site-a-editorial*` files remained.
- Forbidden-scope diff: no change under `public/`, public-route configuration, `app/`, `components/`, or `lib/`.
- Dangerous mutator scan: no delete/trash/publish path and no capability/token logging.
- `verify:root-only` was not run.

## Strict-mode gate and concerns

A local `Strict` Plan was deliberately run read-only and rejected because `TP-P100` does not resolve to the exact existing Site A Product record. Therefore no `Strict` Apply was attempted. This is the expected remaining integration dependency: Product Task 7 must establish all strict local Product records before the later strict reciprocal-edge Apply.

No Task 8 implementation blocker remains. The local database now contains only the authorized complete synthetic Site A Application/Resource drafts in explicit deferred-Product mode.

## Independent review

Initial review reported five Important concerns: cross-post-type collision coverage, raw metadata visibility, audit selection in the shared installation, rollback-failure cleanup ordering, and adapter-level test coverage. The valid gaps were reproduced and fixed through focused regressions. Stable-ID lookup now searches every post type, raw metadata uses an explicit allowlist, audit selection is exact-inventory based, and rollback cleanup uses nested `finally` blocks.

The canonical-path scope was resolved from read-only local evidence: `/applications` is intentionally represented by the managed Site A draft plus existing generic Site A and Site B Page route rows, neither of which carries an editorial stable ID. Global `public_path` rejection would incorrectly make the approved shared-runtime migration impossible. The final boundary searches all post types for stable-ID collisions and the two managed editorial post types for managed path collisions.

Rereview independently ran the three focused files (7/7), the live 39-no-change Deferred Plan, the 28+11 audit/hash check, PHP syntax, and cleanup inspection. It reported no remaining Critical, Important, or Minor finding and approved Task 8 for commit.

## Commit

Required subject: `feat(editorial): add transactional local draft import`.

The final commit SHA is reported to the controller after creation because a commit cannot contain its own content-derived SHA.

## Fix Round 1 evidence

Controller review round 1 requested six Important fixes. The two Minor findings (audit-result marker validation and moving capability tokens out of Docker command arguments) remain deliberately deferred for final triage.

The round began with executable regressions against the committed implementation. The four focused files reported 7 expected failures and 5 passes. The failures independently reproduced restricted canonical-path lookup, expected-ID-only audit selection, capability parsing before PHP-side environment validation, unsafe device/provider path handling, missing aggregate cleanup, and inaccessible inline production adapters.

Implemented fixes:

- Production audit now enumerates the narrow shared-installation identity population: every Application/Resource post plus every post carrying either editorial stable-ID key. It reads only candidate type, scope, and stable IDs until a record is proven exact Site A and managed. Unknown or malformed exact-Site-A identities, duplicates, and cross-site copies of expected IDs fail. Unrelated non-Site-A IDs—including exact Site B IDs—are ignored without reading or exporting their content. A real transaction-created extra Site A identity is rejected by the production adapter and then rolled back.
- Canonical `public_path` lookup now queries `post_type: any` and rejects wrong-type, Site B, mixed-scope, and duplicate owners. The sole exception is evidence-bound to the two existing published `/applications` Page shells: `tio2-a--applications` / `Site A Synthetic Test Applications` / exact Site A scope, and `tio2-b--applications` / `Site B Synthetic Test Applications` / exact Site B scope, both without editorial IDs. No other Page/path exception exists.
- Both PHP entry points independently require CLI plus exact `DB_NAME=tio2_local`, `DB_HOST=db:3306`, `home=http://localhost:8080`, and `siteurl=http://localhost:8080` before capability parsing, manifest reads, record reads/writes, or lock acquisition. Direct importer and audit invocation tests with remote constants reject before capability access.
- Both wrappers now reject UNC, device, provider-qualified, URI, wildcard, and non-fixed-drive paths before manifest reads or staging. Executable tests cover UNC, `\\?\` device, and PowerShell provider forms against both wrappers.
- Shared finalization attempts every runtime/capability deletion and all three final source hashes, aggregates failures only after all attempts, and preserves an operation error alongside cleanup errors. Apply capability paths remain under outer ownership until inner deletion succeeds, so a failed inner cleanup is retried. Deterministic injection proves a locked first path does not prevent later deletions or any final hash and that a subsequent owner retry removes it.
- The real WordPress adapter closures are now reusable without changing the production entry-point contract. A repeatable local test performs one real transaction through identity creation, WordPress update, ACF, taxonomy, relationships, normalized readback, and rollback; then a second transaction injects failure inside the real `buyer_problem` ACF update after identity, taxonomy, prior metadata, and parent relationship effects. It proves identity/meta/path/relationship rollback, webhook queue restoration, unchanged Site B, unchanged authorized 39-record readback, and rejection/rollback of a real extra audit record. The live test exposed stale WordPress cache state after SQL rollback; the production rollback adapter now flushes those caches after a successful `ROLLBACK`.

Read-only local evidence after all fixes:

```text
Deferred Plan SHA-256       48deb4de7c1143c73b69db421e079b45bad45b767133bfe01ff62b40cdb9636f
Plan actions                0 create, 0 update, 39 no-change
Deferred Product edges      39
Audit records               28 Applications + 11 Resources = 39
Readback SHA-256            sha256:dceb63a584b223e7857a47bf791bc3db5f4a0059652932bf3d571ca653639315
Deferred-edge SHA-256       sha256:e04c77af8f66774c09b443f691faf25840afe42b5ca8920006d3a505245a7c03
Site B invariant SHA-256    sha256:3eae18f5bcc98ae4d2f1ff593c4e7867d9517e6d1654317c610ddef6f4371a58
```

Fix-round verification:

```text
Focused + Product/Application/Resource regressions: 7 files, 21 tests passed
TypeScript typecheck: passed
Scoped ESLint: passed
PowerShell syntax: 3 files passed
PHP syntax: importer and audit passed in local wpcli
Runtime capability/stage files remaining: 0
```

No Apply or Strict command was run in this fix round. The only database writes were disposable local transaction fixtures, each rolled back; the existing 39 authorized Deferred drafts, Product records, Site B, queue, and normalized hashes remained unchanged. No public, remote, deployment, migration, controller-ledger, or `verify:root-only` operation was performed.

## Fix Round 2 evidence

Fix Round 1 rereview found that WordPress expands `post_type => any` only to types not excluded from search. In this installation that omitted at least `tio2_product` and `tio2_homepage`, leaving search-hidden stable-ID and canonical-path owners outside the collision gate.

The new TDD cycle failed in three independent places before production changed:

```text
Focused files             3 failed, 1 passed
Controlled importer       literal all-owner query scope rejected `any`
Controlled audit          cross-type candidate scope rejected `any`
Live reversible adapter   real tio2_product canonical-path owner was invisible
```

The importer now exposes one shared deterministic helper that starts from the complete registered post-type set, excludes only named non-content storage (`acf-field`, `acf-field-group`, `acf-post-type`, `acf-taxonomy`, `custom_css`, `customize_changeset`, `oembed_cache`, `revision`, and `user_request`), removes duplicates, and sorts the result. A future registered custom type is included unless it is explicitly classified as one of those internals. Stable-ID collision lookup, canonical `public_path` lookup, and both cross-type audit identity queries use the same explicit list; no collision query retains `post_type => any`.

The live list used after the fix was:

```text
attachment, nav_menu_item, page, post,
tio2_application, tio2_document, tio2_faq, tio2_grade, tio2_homepage, tio2_product,
wp_block, wp_font_face, wp_font_family, wp_global_styles, wp_navigation,
wp_template, wp_template_part
```

Controlled tests also register a synthetic `hidden_search_content` type and require it in the sorted query list, while explicitly proving the internal types are absent. The live reversible test creates an actual draft `tio2_product` inside the production SQL transaction, assigns the managed `/applications/coatings` path and expected `application_id=coatings`, and proves both path lookup and audit enumeration reject it. The transaction rolls back and flushes caches; the disposable Product identity/path/meta and taxonomy effects do not survive.

Read-only evidence after rollback:

```text
Deferred Plan SHA-256       48deb4de7c1143c73b69db421e079b45bad45b767133bfe01ff62b40cdb9636f
Plan actions                0 create, 0 update, 39 no-change
Deferred Product edges      39
Audit records               28 Applications + 11 Resources = 39
Readback SHA-256            sha256:dceb63a584b223e7857a47bf791bc3db5f4a0059652932bf3d571ca653639315
Deferred-edge SHA-256       sha256:e04c77af8f66774c09b443f691faf25840afe42b5ca8920006d3a505245a7c03
Site B invariant SHA-256    sha256:3eae18f5bcc98ae4d2f1ff593c4e7867d9517e6d1654317c610ddef6f4371a58
```

The two original Minor findings remain deferred. No Apply, Strict Apply, publication, remote operation, deployment, Product commit, Site B write, public-route change, controller-ledger edit, or `verify:root-only` command was performed.
