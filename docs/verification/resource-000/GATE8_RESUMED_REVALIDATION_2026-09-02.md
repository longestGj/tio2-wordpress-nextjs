# RES-000 Gate 8 resumed revalidation — 2026-09-02

Status: **EXISTING IMPLEMENTATION REVALIDATED / NOT RELEASED**

## Scope and history

- Target: `RES-000` at `/resources/`, exact `site_scope=tio2-my`.
- Gate 7 package: `RES-000-G7-HANDOFF-01`; the current explicit authorization supersedes the historical phase labels embedded in the sealed evidence files.
- The implementation commits `8b92ed3`, `018a79b`, `969d250` and Gate 8 closure record `a6b0c40` are ancestors of the revalidation baseline `2a2d938`.
- Read-only audit found the complete approved implementation already present. No runtime code, WordPress schema, shared Chrome, page copy, metadata, CSS, route, cache, form, media, sitemap, or prior screenshot was changed in this resumed pass.
- Resource children, RES-ORIGIN, DOC-000 and other pages remained out of scope. No deployment, publication, DNS, production write, indexing, merge, Gate 9 decision, or Gate 10 action occurred.

## Sealed authority integrity

| File | SHA-256 | Result |
| --- | --- | --- |
| `RES-000_GATE7_MANIFEST_V0.1.md` | `FD87080DD63D2992BC146ECBBD90D0E4DAF8FFE0F0F6BA6A1322153EEFB7BD78` | MATCH |
| `RES-000_GATE7_HANDOFF_PACKAGE_V0.1.md` | `2BACAD8A06490D53AF0CB38FB3CD1C2844629FBE0C934CF3358BA5C96ECDA448` | MATCH |
| `RES-000_GATE7_CMS_API_COMPONENT_MAPPING_V0.1.md` | `DB3061BAE05F8A38031F413728B0D056F2AFD2F281EFA0CD406305F1F2A0CEE1` | MATCH |
| `RES-000_GATE7_H0_H5_STATE_FIXTURES_V0.1.md` | `BE5D7EC736CCD8F43E0705EC995C8366CE5C6C54BFE5A6E2011C2B9ADB68FB1F` | MATCH |
| `RES-000_GATE7_ACCEPTANCE_AND_BLOCKERS_V0.1.md` | `86865C680D8DCF9DAB499AC91DCCF8F7F27EF4937DF4B63E682FD4EAEE466FD2` | MATCH |

## Fresh verification results

| Verification | Result |
| --- | --- |
| Resource Hub unit/integration/API/infrastructure suite | PASS — 13 files/130 tests passed; 1 file/1 explicitly gated runtime test skipped in the default command |
| PHP ↔ TypeScript H0–H5 parity plus live WordPress H5 atomic revocation | PASS — 2 files/2 tests with both runtime gates enabled |
| PHP lint | PASS — Resource Hub include and local seed |
| Local WordPress seed | PASS — post 17291, `tio2-my`, `/resources`, `H0_NO_QUALIFIED_RESOURCE` |
| Local GraphQL projection | PASS — one Malaysia record, Featured 0, Latest 0 |
| Changed-surface ESLint | PASS — 0 errors |
| TypeScript `tsc --noEmit` | PASS |
| Cold TiO2 Malaysia preview build | PASS — `/resources` prerendered with one-hour revalidation |
| RES-000 Playwright | PASS — 5/5 at 1440, 768, 430, 390 and 200% page scale |
| Accessibility | PASS — Axe serious/critical 0, initial five answers, semantic headings/disclosures, keyboard focus and Mobile Menu Escape/return |

## H0, SEO/GEO/Schema and isolation

- Current public inventory is 0. Featured and Latest roots/headings/cards/links/spacing are absent, and the Hero CTA resolves to `#research-paths`.
- RES-ORIGIN, fixture-only values, Trade records and row-level Product relations have zero API/DOM/link/sitemap/Schema output.
- Title, approved Meta and the single self-canonical `https://tio2malaysia.com/resources/` match the Gate 7 contract. Preview robots remain `noindex, nofollow`; hreflang is absent.
- JSON-LD is one graph containing only `CollectionPage` and `BreadcrumbList`; conditional `ItemList` is absent in H0. Prohibited FAQPage/QAPage/Article/Product/Offer types are absent.
- All five Buyer Question answers remain in the initial server-rendered DOM.
- CMS singleton, relation filtering, public projection, route, metadata, menu, Production SVG media, RFQ context, cache tags and H5 invalidation remain restricted to `tio2-my`; missing Malaysia content fails closed with no foreign-scope fallback.
- Shared Header/Footer are consumed once. Resources current state has `aria-current`, Desktop 3px underline, Mobile 4px left marker, visible `CURRENT` count 0, fixed RFQ and the shared Production SVG Logo.

## Responsive evidence

The four screenshots were freshly overwritten by the resumed run and produced the exact prior hashes, demonstrating that the RES-000 output remained pixel-stable after the intervening Grade work.

| Viewport evidence | SHA-256 |
| --- | --- |
| `resource-000-1440.png` | `ED0F9B2B85120EDF46A4995D10FE7FFCCF782580F8E4397C75360E4F4DCB9E6D` |
| `resource-000-768.png` | `7E252F1FD9498C08354629174D1F156B522E7011B661ABBC5425F55423BC2908` |
| `resource-000-430.png` | `DE645755D8E5D941F3F90B172652673FD2FB51A89F18EB7494F48ED7BA7A7AA3` |
| `resource-000-390.png` | `BE84DBB83BDD9A8F0B187BB77234150D7B076F15785A1741AB8E5428D1500601` |

At 200% page scale, `visualViewport.scale=2`, page width remained one-dimensional, content/actions remained available and Buyer Question focus remained usable.

## Carried blockers and stop point

- `RES-R002`–`RES-R007` remain open; `RES-R008`–`RES-R009` remain controlled as recorded by Gate 7.
- No Resource child route or Trade item is approved or implemented. Ineligible candidates remain excluded rather than rendered as placeholders or guessed links.
- Shared `/request-a-quote/` readiness, indexing and sitemap authorization remain release blockers; there is no Contact fallback.
- This revalidation is evidence for the requested Gate 8 handoff only. It is not publication, release, Gate 9 PASS or Gate 10 authorization.
