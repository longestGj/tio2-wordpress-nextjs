# TiO2 Malaysia Full Public SEO/GA4 Gate 9 Return Receipt 01

- Review ID: `TIO2-MY-G9-PCR-01`
- Handoff ID: `G8-G9-TIO2-MY-FULL-PUBLIC-SEO-GA4-20260913-RETURN-01`
- Gate 8 task ID: `D16-G8-TIO2-MY-FULL-PUBLIC-SEO-GA4-20260913-01`
- Site scope: `tio2-my`
- Branch: `codex/tio2-my-full-public-seo-ga4`
- Baseline commit: `c5976a23ab1dc93618b0c79008c02fda69ed9f5a`
- Implementation commit: `1bbcd0910c67d328e69afac5a78c034194ff764c`
- Build ID: `tio2-my-seo-ga4-1bbcd091`
- Next runtime: `http://127.0.0.1:3123`
- Independent local CMS runtime: `http://127.0.0.1:8280`
- Runtime hold: until Gate 9 returns PASS or RETURN

## Return findings closed

1. Inactive Analytics consent now normalizes any stale accepted state to `necessary_only`, publishes shared consent as denied, and exposes no Analytics checkbox, Accept, Save or withdrawal control. The runtime produced zero Google Analytics/Tag Manager requests.
2. All four Trade resources and their Resource Hub projections are bound to the approved D23 launch-fact closure checked on 13 September 2026. The copied authority artifact has SHA-256 `56974A5F9508A28512CB71D52F5E9BB7FC7210F7DD0A03D3544FAAD07721557C`; CMS records expose the matching review date.
3. The authorized GSC ownership file is served byte-for-byte at `/googleaa2e91750b47f47a.html`: 53 bytes, SHA-256 `23C09B78F763724DDDB0470B133ACC3F3D2129B663209E6B8007C290D2B0B32D`.

## Verification

- Targeted Vitest: 38 files passed; 201 tests passed; 1 conditional skip.
- TypeScript: passed.
- ESLint on the changed TypeScript/TSX scope: passed.
- Next.js production build: passed.
- Playwright: 4/4 passed on the held build. It verifies 58 routable objects, 57 sitemap URLs, analytics remaining inactive, all four Trade pages plus the Resource Hub, 404 search behavior and the exact GSC file.
- Runtime audit: consent fail-closed behavior, four Trade pages, Resource Hub, GSC hash, sitemap count and 404 canonical absence passed.
- CMS audit: all four Trade records publish with `reviewDate=2026-09-13`; the Resource Hub contract validates.
- Visual inspection: inactive Cookie Settings dialog, EU Trade page and Resource Hub at 768 px are readable and internally consistent.

The CMS used for this acceptance candidate is an isolated local Docker copy restricted to `127.0.0.1`; the production CMS was not written. No real form submission, merge, deploy, publication, DNS, GSC verification action, indexing request or Gate 10 action was performed.

## Release-level open items

- Real GTM/GA4 identifiers and the atomic active legal/CMP state still require separately bound release evidence before Analytics activation.
- The production `www` to apex behavior for the GSC file remains a Gate 10 runtime check; this local Next.js candidate proves the apex path only.

Gate 9 must independently return PASS or RETURN. This receipt does not declare Gate 9 acceptance.

## Evidence references

EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/build-identity.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/build.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/cms-runtime.json
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/eslint.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/playwright.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/runtime-audit.json
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/summary.json
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/targeted-vitest.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/typecheck.txt
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/cookie-settings-inactive-1440.png
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/trade-eu-1440.png
EVIDENCE: docs/verification/tio2-my-full-public-seo-ga4-gate8-return-01/resources-768.png
