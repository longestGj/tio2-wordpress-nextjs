# Trade 4 + Application 5 Gate 9 repair — direct CMS final return

Date: 2026-09-08. Status: **the authorized isolated-CMS alignment is complete; F01, F03 and F04 now pass against the direct 8186 CMS runtime. F02 remains OPEN. This is not Gate 9 approval, deployment or publication.**

## Identity

- Branch: `codex/country-editorial-integration`.
- Implementation commit: `4a7e170b0bba90ce8428b8f23788c15e3e64dde4`.
- Prior repair evidence commit: `37073778c4e19c47a96e105e0c7bfb0e1cd75f89`.
- Direct-CMS production preview: `http://127.0.0.1:3231`.
- BUILD_ID: `nueBC1PmlOz7I74G5G0oP`; build directory `.next-gate9-direct-4a7e170`.
- CMS: task-owned isolated review clone `http://127.0.0.1:8186/graphql` / Docker project `tio2my9`.
- The temporary 8191 response overlay is closed. The build and runtime in this return connect directly to 8186.

## Authorized CMS synchronization

The Plan phase verified the local task ID, unique post owner, exact `tio2-my` scope and the complete allowed field delta before any write. Apply updated only these three stored meta values to the exact approved repository config bytes:

| Target | Post | Before SHA-256 | After SHA-256 | Exact delta |
|---|---:|---|---|---|
| APP-COAT | 18537 | `d7b2f8d9a631db764a831a4d5e58c73737e5df20f8901e72b46fceb5a9c00676` | `a12800d9c47bef1f8d5bb146e8a89264dfd079c37af3619684ef1d168bbc673b` | `identity.provisional: false → true` |
| RES-TRADE-UK | 18531 | `8e9c5b448cb6b8f86badcd78473059191eaa0e33bfd0589f252fdb54c839f376` | `a2d2901d2a2040f6ffce86b844b033b09060f352be8fcd80ca6812feb05d2e45` | approved HMRC URL replacement and its derived rendered-body hash |
| CONV-RFQ | 17326 | `51efb33afb0cd3b3b895a8751dae53fe9c4308f8ce4df83c58651f9e74b745ab` | `05867a362556255d564df614dc1492f1e6e35be4d5eae90a3ee2a81731692938` | add `MARKET-BR-EN`, `MARKET-BR-PT` to `prefill.approvedSourcePageIds` |

Every remaining parsed field had to equal the previous contract or the script aborted. Apply used in-memory automatic rollback on any partial failure. `cms-rollback-seed.json` contains the exact prior bytes and hashes for explicit restore.

## Direct readback and runtime results

- APP-COAT and RES-TRADE-UK GraphQL records match approved config bytes exactly. APP-COAT reads `provisional=true`; UK contains the new URL once and the dead URL zero times.
- CONV-RFQ matches approved config bytes exactly and contains both Brazil source IDs once.
- Both unchanged Brazil CMS records match their approved semantic contracts and continue to resolve through their native validators.
- Direct production build passed: compile, TypeScript, page-data collection and 54/54 static-page generation.
- All five Application routes returned 200 with `noindex,nofollow`, no canonical, no `og:url`, and zero URL-bearing JSON-LD blocks. Each retained at least one visible approved `/applications/` link.
- `/markets/brazil/` and `/pt-br/markets/brazil/` returned 200 with their exact `MARKET-BR-EN` / `MARKET-BR-PT` identities and `en` / `pt-BR` document language.
- RES-TRADE-UK returned 200, displayed six official-source links, and contained exactly one `HMRC trade remedies guidance` link to the approved maintained URL.
- The external links were not redundantly rerun in this final local pass. The immediately preceding repair evidence at `../trade4-app5-gate9-repair-20260908/runtime-results.json` records Chromium HTTP 200 for all six, including the maintained HMRC/GOV.UK page.

## Finding disposition

- **F01: repaired and direct-CMS verified.**
- **F02: OPEN cross-page approval blocker.** `/applications/` still returns 404. APP-000 still has no approved Gate 6 / Gate 8 package; all approved labels and links remain visible and unchanged.
- **F03: repaired and direct-CMS verified.** Both approved Brazil destinations return 200 with no fallback.
- **F04: repaired and direct-CMS verified.** The label, description, order and all other UK content remain unchanged; only the approved target and derived integrity hash changed.

## Rollback and boundaries

The exact Plan, Apply result, before-value seed, sync script and commands are stored beside this return. Restore is intentionally not executed because the direct-CMS review environment must remain aligned for Gate 9. The restore command in `commands-and-rollback.md` changes only the same three local meta values back to their recorded hashes.

No production or remote CMS was written. No merge, push, deployment, publication, DNS, indexing, real form submission or email was performed.
