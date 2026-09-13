# Task 2 report — PHP legal read contract and resolver wiring

Date: 2026-09-13 (Asia/Shanghai)

Branch: `codex/cms-read-approval-decoupling`

Starting HEAD: `bc61e4a2`

Task commit: this commit, `feat: separate MY legal read validation from write approval`

## Result

- Added `tio2_validate_legal_page_read_contract(int $post_id)` and a public projection helper backed only by the Task 1 technical contract. It validates the real WordPress post type, published status, exactly one `tio2-my` scope, registered public path, decoded object shape, fixed identity, real date, public text fields, Unicode code-point limits, breadcrumb/canonical destinations, Markdown safety, Unicode section IDs, link grammar and action layout.
- The resolver now uses only the read validator. It retains its exactly-three and route-duplicate/incomplete checks, returns changed CMS prose, and serializes an explicit public-field projection. Approval evidence and arbitrary unknown CMS metadata are accepted outside the public schema but never exposed.
- The existing `tio2_validate_legal_page_v01_contract` body, approval loaders, seed validator target and release-registry validator target are unchanged. The harness proves changed safe prose still fails write approval and foreign-scope writes still fail.
- Added a network-none PHP CLI harness with in-memory WordPress boundary stubs. It loads the real plugin module and feeds all shared Task 1 `source`, `contract` and `collection` vectors through the real resolver; the Vitest integration passes an accepted resolver response directly to `toMalaysiaLegalPagesDto`.

## TDD evidence

- Initial RED on `bc61e4a2`: network-none PHP ran the new harness with a changed-heading record. The unchanged write validator rejected it, and the old resolver threw `A Malaysia Legal page record failed scope or contract validation` from `legal-pages-v01.php:82`.
- Initial GREEN: the harness reported `PASS 31 shared legal read vectors (3 accepted, 28 rejected); real resolver and write isolation`; the PHP-to-resolver-to-real-TypeScript-DTO integration passed 1/1.
- Self-review RED: a repeated identical `tio2-my` scope was accepted because the first implementation deduplicated scope slugs. The focused harness failed `repeated site scope is rejected directly`.
- Self-review GREEN: the read boundary now compares the full ordered scope list to exactly `['tio2-my']`; the same harness passed all 31 shared vectors and direct type/status/scope checks.

The shared cases explicitly exercised 60,000 supplementary Unicode code points (accepted), 100,001 code points (rejected), NFKD-equivalent `Details` / `Détails` duplicate section IDs, an emoji-only empty section ID, multiline-link bypasses, and identical hero/final action repetition. PHP uses `mb_strlen(..., 'UTF-8')` and `Normalizer::FORM_KD`, failing closed if intl is absent.

## Verification

Runtime: `wordpress:cli-php8.3`, image ID `sha256:2b5e9d4d3e51909dca1aaa4732e9f5e5bf0377c2114dbd8ff39f060bff202586`, PHP 8.3.33, `intl=yes`, `mbstring=yes`, bind mount read-only, `--network none`.

- PHP syntax checks for the new validator, module wiring and harness: 3/3 passed.
- `php tests/infrastructure/php/legal-read-contract.php` via the isolated container: 31/31 shared vectors classified as expected (3 accept, 28 reject); direct write-isolation and post type/status/exact-scope assertions passed.
- `php tests/infrastructure/php/content-release-validation.php` via the isolated container: `PASS 57 page policies, 1692 text paths; editorial and Sample actual validators`.
- `npx vitest run tests/infrastructure/legal-read-contract.test.ts tests/infrastructure/tio2-my-legal-pages-wordpress.test.ts tests/unit/wordpress-content-release.test.ts`: 3 files, 5 tests passed.
- `npx vitest run tests/unit/legal/legal-pages-read-contract.test.ts`: 1 file, 33 tests passed.
- `npm run typecheck`: Next route type generation and `tsc --noEmit` passed.
- `git diff --check`: passed; only the existing Windows line-ending notice was emitted.

## Boundaries and concerns

- No shared comparator behavior, approved contract, seed, release registry, CMS/DB data, remote service, deployment, `main` or `develop` was changed.
- The PHP runtime must retain `intl` and `mbstring`; validation fails closed without `intl`, and the verified WordPress PHP 8.3 image supplies both.

## Review fix round 1

Review base: `317cd36b`.

- Update-line parity: the PHP validator previously counted matching update lines across the whole document, while the TypeScript parser requires exactly one match in the hero before the first H2. Shared vectors now prove that a section-only update is rejected and that one hero update plus an additional section update is accepted. The PHP scan is now restricted to hero lines.
- Whitespace parity: PHP PCRE `\s` / `\S` and `trim()` disagree with ECMAScript for U+FEFF and U+0085. The validator now declares the exact ECMAScript whitespace and line-terminator code points and uses that class for public-field boundaries, H1/H2 content boundaries, update matching, action-prefix removal and action-label trimming. Shared vectors cover both code points at field, heading, update and action positions without loosening the TypeScript contract.

Fix-round TDD and verification:

- RED: the existing TypeScript implementation passed 43/43 shared-vector unit tests after adding ten cases; the PHP harness then failed because it accepted `rejects update line that appears only after the first H2`.
- GREEN: isolated PHP harness — `PASS 41 shared legal read vectors (8 accepted, 33 rejected); real resolver and write isolation`.
- PHP syntax: the read validator passed `php -l` in the network-none PHP 8.3 container.
- Legacy PHP comparator: `PASS 57 page policies, 1692 text paths; editorial and Sample actual validators`.
- Combined Vitest: 4 files, 48 tests passed (`legal-pages-read-contract`, PHP/DTO integration, WordPress wiring, content-release regression).
- `npm run typecheck`: Next route type generation and `tsc --noEmit` passed.
