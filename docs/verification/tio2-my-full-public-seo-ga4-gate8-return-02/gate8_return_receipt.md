# TiO2 Malaysia Full Public SEO/GA4 Gate 9 Return Receipt 02

- Review ID: `TIO2-MY-G9-PCR-02`
- Handoff ID: `G8-G9-TIO2-MY-FULL-PUBLIC-SEO-GA4-20260913-RETURN-02`
- Gate 8 task ID: `D16-G8-TIO2-MY-FULL-PUBLIC-SEO-GA4-20260913-01`
- Site scope: `tio2-my`
- Branch: `codex/tio2-my-full-public-seo-ga4`
- Baseline commit: `c5976a23ab1dc93618b0c79008c02fda69ed9f5a`
- Implementation commit: `975a573ec09f4dcb0aca46422b2e9e2e4d20c742`
- Build ID: `tio2-my-seo-ga4-975a573e`
- Build directory: `.next-gate8-full-public-seo-ga4-return02-final`
- Next runtime: `http://127.0.0.1:3123`
- Independent local CMS runtime: `http://127.0.0.1:8280`
- Runtime hold: until Gate 9 returns PASS or RETURN

## Returned finding closed

The UK and Brazil Trade records no longer contain the stale phrase `checked on 7 September`. The two approved public facts now state `checked on 13 September 2026`, and the immutable `renderedBodySha256` values were recomputed from the corrected payloads. The focused contract test scans all four Trade bodies and the Resource Hub, and the held runtime repeats the same absence check.

The UK current-status row now states that no titanium-dioxide stop notice was located in the official sources checked on 13 September 2026. The Brazil definitive-measure row now states that the measure remained in force when checked on 13 September 2026. No other approved business fact was changed.

## Verification

- Targeted Vitest: 38 files passed; 201 tests passed; 1 conditional skip.
- TypeScript: passed.
- ESLint: 86 changed TypeScript/TSX files passed.
- Next.js production build: passed; all 67 static pages generated under Build ID `tio2-my-seo-ga4-975a573e`.
- Playwright: 4/4 passed. It verifies 58 routable objects, 57 sitemap URLs, blocked analytics, all four Trade pages plus the Resource Hub, 404 search behavior, the exact GSC file, and absence of the stale checked date.
- Runtime audit: all four Trade pages and the Resource Hub return HTTP 200, contain the 13 September facts, and contain no `checked on 7 September`; consent remains fail-closed; the GSC file, sitemap and 404 checks pass.
- CMS audit: all four Trade records are published with `reviewDate=2026-09-13`; UK hash is `579a3c32c82847b1c841510b7c4b440c7f1e08d4f2287690241d40d1b18388a1`; Brazil hash is `c5fbc50c37b0684a3f24e0c74a0c993f2a2cccf75f9f52abeeb712d7a3634986`; the Resource Hub validates and contains no stale checked date.
- Visual inspection: UK Trade, Brazil Trade and the Resource Hub remain readable and internally consistent at the captured desktop/mobile widths.

The isolated CMS initially lacked the two GraphQL schema adapter plugin files retained by its cloned active-plugin records. Those files were copied from the existing local prerelease container into this isolated container, the isolated container was restarted, and its product/detail records were refreshed from the checked-out local seed scripts. This was an environment/data-alignment issue; the final clean build and held runtime use the corrected isolated CMS. The production CMS was not written.

No real form submission, merge, deploy, publication, DNS, GSC verification action, indexing request or Gate 10 action was performed.

## Release-level open items

- Real GTM/GA4 identifiers and the atomic active legal/CMP state still require separately bound release evidence before Analytics activation.
- The production `www` to apex behavior for the GSC file remains a Gate 10 runtime check; this local Next.js candidate proves the apex path only.

Gate 9 must independently return PASS or RETURN. This receipt does not declare Gate 9 acceptance.

## Evidence references

EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/build-identity.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/build.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/cms-alignment.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/cms-runtime.json
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/eslint.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/playwright.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/runtime-audit.json
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/summary.json
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/targeted-vitest.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/typecheck.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/trade-uk-1440.png
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/trade-brazil-1440.png
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-02/resources-768.png
