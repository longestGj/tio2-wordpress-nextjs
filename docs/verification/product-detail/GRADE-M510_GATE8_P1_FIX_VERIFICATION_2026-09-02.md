# GRADE-M510 Gate 8 P1 Fix Verification — 2026-09-02

## Scope and status

- Review target: Gate 8 commit `a8e4f5d4ab0fe2f12ce273d35bd8b394a36e29f6`
- Fix scope: P1-01 approval registry derivation and P1-02 approved contract hash binding only
- Site and routes: `site_scope=tio2-my`; `/products/m-350/` and `/products/m-510/`
- Result: local implementation and verification complete; pending Gate 9 read-only review
- This record is not deployment, publication, indexing, Gate 9 approval or Gate 10 authorization.

## P1-01 — one approval registry

`tio2-my-product-detail-identities.json` is the only Product Detail approval registry. Its `implementationState`, identity, route, contract filename and approved hashes drive:

1. Next.js `generateStaticParams` and dynamic-route rejection;
2. public slug validation;
3. approved contract selection in the DTO;
4. cache-tag validation;
5. the WordPress GraphQL resolver and stored-contract validation;
6. both local preview seeds.

The Node loader contains only the build-time JSON import manifest needed to bundle approved contract files. It does not contain a second approval allowlist. Contract tests assert that the route, DTO, types, cache and PHP resolver contain no local `m-350` or `m-510` authorization literals.

Registry result:

- enabled: `M-350`, `M-510`;
- identity-only and disabled: the other 12 registered Grades;
- production build static entries: `/products/m-350` and `/products/m-510` only;
- E2E: every other registered Grade returns 404 without an indexable M-350/M-510 shell;
- direct `m-896` query is rejected before any CMS request.

## P1-02 — approved hash binding

Hash algorithm: `sha256-json-recursive-key-sort-v1`.

- Parse JSON.
- Recursively sort object keys using ordinal string order.
- Preserve array order and scalar values.
- Serialize compact UTF-8 JSON.
- Return uppercase SHA-256 hexadecimal.

M-510 binding:

- approved D23 source-file SHA-256: `09B41E1AB403372495D4BE8DB3DDD1260A710E310327FC289D8D344B05AB095C`;
- repository source-file SHA-256: `0F02330A33E24D49768F1451884A9F78BE16D398EAE7DEBECC5804FF5A204A43`;
- approved and repository canonical SHA-256: `706A8962F5B90D857EE2595138CDEDCA4E22A7398F5C18CDCFA8E1E8186C4D22`.

The raw files differ only in transport formatting (line endings/trailing newline). Node and PHP independently produce the same canonical hash. Runtime and seed loading fail closed when the canonical hash is missing, malformed or does not match. Tests also pin the exact approved D23 raw source hash, so its audit binding cannot drift unnoticed.

M-350 is protected by the same mechanism:

- approved source SHA-256: `3870F0559633DCA878BBB9D6627255CF2AF04F430C5528E4380A9C93F66640ED`;
- approved canonical SHA-256: `EDFFBBCBF27E988EFC93454730C6D8FB986253D9A552278D56D3293BAE58A550`.

## Runtime and automated verification

| Check | Result |
|---|---|
| PHP syntax | PASS |
| Local M-350 and M-510 seeds through validated registry | PASS |
| Live local GraphQL | PASS — M-350 15 rows, M-510 12 rows, M-896 unauthorized |
| Focused Vitest | PASS — 10 files, 35 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| Fresh TiO2 Malaysia production build | PASS |
| Product Detail Playwright | PASS — 15/15 |
| M-350 regression | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| M-510 regression | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Other 12 Grade identities | PASS — 404 and no indexable fallback shell |
| Axe and horizontal overflow checks in E2E | PASS |

No rendering component, CSS, copy, metadata, JSON-LD or Global Chrome file changed in this P1 fix. Therefore the approved M-510 visual evidence remains byte-identical:

| Viewport | SHA-256 |
|---:|---|
| 1440 | `93B77D1B0BDFDC35F52E8FEC842627B40A62ED504464A0172D17FA486807E809` |
| 1024 | `A751A68C6801BA3EE932DE52A191611730BC86CB53D7B51E71DD223A47E95A21` |
| 768 | `3CB6E0C041DDF21B6BB804870AB3F75F03CAEDECB991207D4E41AC3870BA0F0C` |
| 430 | `849C17A2E70DCDFC84597A899EF0DFB556AA6F53795039CF2A3CC85B8FF3C0EA` |
| 390 | `B9B02615F1C7D45132CF6B4EEA793BFCC727CB9AEC4B7139BC0B515333A417FE` |
| 320 | `9924E37AC19803CEAE3D013F1F79F9D0D4E18663B6716AAFC340E29D9F6BD695` |
| 200% equivalent | `8F5310AF58BF97FEA9784F63B6D83FEC51111786166E908357DD055C16E4B9D7` |

## Unchanged release boundary

- Gate 9 read-only review is still required.
- Indexing and sitemap authorization remain false.
- Unready contextual destinations remain omitted/fail-closed.
- No deployment, DNS, production write, public indexing or Gate 10 operation was performed.
