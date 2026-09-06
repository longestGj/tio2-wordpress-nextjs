# HOME-001 P0 Tablet and Canonical Verification

## Scope

- Worktree: `D:\16Wordpress_nextjs\.worktrees\home-001-tio2-my`
- Branch: `codex/home-001-tio2-my`
- Runtime baseline: `b27c643`
- Verification date: 2026-08-31
- Runtime implementation changed: no
- Deployment, publication, DNS, production indexing or production writes: none

The P0 work consumes the user-directed Tablet V0.2 evidence and the normalized
canonical acceptance rule. It does not change `site_scope`, page copy,
responsive behavior, SEO/GEO data or the five-node Schema graph.

## Tablet V0.2 input identity

| Viewport | File | Dimensions | Bytes | SHA-256 |
|---|---|---:|---:|---|
| 768 | `D:\23MySec\pages\home\04_planning\visual-designs\responsive-evidence\homepage-tablet-768-evidence-v0.2.png` | 768×6844 | 444731 | `E642EA33FD0755884529AB35E3A80062A7F44F8A9D31E209F271176CCC5EA357` |
| 1024 | `D:\23MySec\pages\home\04_planning\visual-designs\responsive-evidence\homepage-tablet-1024-evidence-v0.2.png` | 1024×5220 | 448760 | `F81110344F7946185504D7A5D37E50CA0AC1E4DF72826F67F40EC528E8E3897C` |

The measured dimensions, byte counts and hashes match
`HOME-001_GATE7_MANIFEST_V0.2.md`. V0.2 visibly restores Resources / Buyer
Answers and the page-level RFQ before the retained Footer. The immutable
homepage contract still contains Start Here; the user directed development to
keep the existing page body and responsive implementation unchanged.

## Rendered Tablet evidence

The checks ran against the local Next.js production artifact with
`SITE_ID=tio2-my` at `http://127.0.0.1:3003/`.

| Check | 1024 | 768 |
|---|---|---|
| DOM module order | `hero → start-here → markets → products → applications → company → documents → resources → page-rfq` | same |
| Resources heading visible | pass | pass |
| All three Buyer Answers visible | pass | pass |
| Page-level RFQ visible | pass | pass |
| Header RFQ visible and scoped `tio2-my` | pass | pass |
| Footer RFQ visible and scoped `tio2-my` | pass | pass |
| Mobile Menu RFQ visible and scoped `tio2-my` | not applicable; Desktop nav | pass with Menu open |
| Product groups open for Tablet | pass | pass |
| Horizontal overflow | `0` | `0`, both Menu closed and open |
| Console warnings/errors | none | none |

Measured runtime geometry:

- 1024: client width `1024`, document height `6618`, horizontal overflow `0`.
- 768 Menu closed: client width `753` after scrollbar, document height `7347`, horizontal overflow `0`.
- 768 Menu open: client width `753`, document height `7556`, horizontal overflow `0`.

These are rendered implementation measurements, not replacements for the
deterministic Gate visual dimensions.

## Canonical integration and rendered output

The route-level integration test calls the real `app/page.tsx`
`generateMetadata()` path with an exact `tio2-my` Homepage DTO. It asserts a
single scalar canonical and standards-based equivalence between the two
accepted root spellings.

The local production render emitted:

- rendered canonical count: `1`;
- raw `href`: `https://tio2malaysia.com`;
- normalized `href`: `https://tio2malaysia.com/`;
- protocol: `https:`;
- hostname: `tio2malaysia.com`;
- pathname: `/`;
- query: empty;
- fragment: empty;
- cross-scope host/token: none.

No second canonical was added and Next.js Metadata remains the only canonical
emission path.

## Test evidence

- `npx vitest run tests/integration/homepage/seo.test.tsx tests/unit/homepage/malaysia-template.test.tsx tests/unit/homepage/metadata.test.ts`: 3 files, 22 tests passed.
- `npx eslint tests/integration/homepage/seo.test.tsx`: passed with no findings.
- `npm run typecheck`: passed.

## Development decision

The P0 tests found no material canonical or Tablet runtime defect. Therefore no
runtime component, CSS, content, site-scope, metadata or Schema code was
changed. The only code-repository changes are the canonical integration
assertions and this verification record.
