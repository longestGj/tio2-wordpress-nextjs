# TiO2 Malaysia nine-page Gate 8 implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for implementation and review. Track completed work below; do not repeat finished tasks.

**Goal:** Implement the four Trade Resource and five Application pages authorized by G8-TRADE4-APP5-20260908-01.

**Architecture:** Reuse Malaysia Global Chrome/Consent/conversion owners. Add one Malaysia editorial CMS contract with nine distinct approved bodies and independently scoped visual styles; the delivery DTO validates exact CMS identity, scope, source-bound revision and safe semantic body before SSR. Store approved body markup as structured CMS JSON content, not whole planning documents or simulation scripts. Page-specific metadata, breadcrumb, dates, links and freshness travel with the same record.

**Tech Stack:** Existing Next.js/React/TypeScript, WPGraphQL/PHP, Vitest, Playwright. No new dependency or remote deployment.

**Spec:** D:/23MySec/docs/architecture/GATE8_TRADE4_APPLICATION5_AUTHORIZATION_AND_DISPATCH_V1.0.md and each exact Gate 6 package in intake.json. Brazil V0.2 explicitly replaces dispatched V0.1 per controller correction.

## Global constraints

- site_scope=tio2-my across query, route, cache, menu, SEO, forms and media; reject absent/foreign/multiple scopes and malformed/draft/duplicate content without fallback.
- Preserve all approved visible text, module order, source labels and Grade relationships. Four provisional Application URLs remain exact local preview routes, no index/sitemap release.
- Main/metadata generated from the same validated CMS payload; source-bound config is approval verification/seed input, never an outage fallback.
- Trade freshness is independently rechecked; new facts return to content owner. Freshness withdrawal must remove body and machine claims together.
- No D23 writes, merge, push, deployment, production writes, real forms/mail, DNS, indexing or Gate 9 closure.
- Isolated worktree D:/16Wordpress_nextjs/.worktrees/trade4-app5-gate8; branch codex/trade4-app5-gate8; base 2c97fe1. Original dirty checkout untouched. Shared baseline inherits committed four-market shared fixes, with current governance copied from root.

## Interface contract

Each `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-<lowercase-page-id>.json` contains:

```ts
type EditorialContract = {
  identity: {pageId:string; siteScope:'tio2-my'; locale:'en'; path:string; section:'resources'|'applications'; provisional:boolean; schemaVersion:'editorial-v0.1'};
  source: {packageId:string; packageSha256:string; bodySha256:string; visualSha256:string};
  seo: {title:string; metaDescription:string; canonical:string};
  heading:string;
  breadcrumb:Array<{label:string; href:string}>;
  bodyHtml:string; // ONLY main.innerHTML, no shared Chrome, scripts, inline CSS or file paths
  mainClass:string;
  freshness:null|{lastReviewed:string; nextReviewDue:string; status:'verified'|'unverified'|'withdrawn'; evidenceDate:string|null};
};
```

Per-page stylesheet `components/sites/tio2-my/editorial/<lowercase-page-id>.css` prefixes every selector with `[data-editorial-page="PAGE-ID"]`; parent renderer owns wrapper, shared Header/Footer, `<main className={page.mainClass}>` and optional anchor focus helper. Styles must not target shared Chrome. Preserve module/classes/data attributes and semantic associations; strip prototype simulation only. Conversion links remain plain approved paths unless a receiver explicitly supports neutral context; no invented adapter.

## Task 1: Intake and exact approved payloads

- [x] Establish worktree and run targeted baseline tests (23 passed).
- [x] Audit nine package hashes/current Manifest chain and B/C/visual inputs; store intake.json.
- [x] For each page, create config, scoped CSS and explicit route calling `renderMalaysiaEditorialRoute(pageId)` / `generateMalaysiaEditorialMetadata(pageId)` from `lib/editorial/malaysia-editorial-route.tsx`.
- [x] First add tests comparing rendered body text/headings/links/table associations to approved B and visual source; run RED, then implement extraction and check GREEN. Retain source provenance and any intentional transformation in receipt.
- [x] Fully inspect page-specific dependencies and all stable AC IDs; audit source links and Trade freshness separately.

## Task 2: CMS and delivery integration

- [x] Add tests in tests/unit/editorial and tests/integration/editorial covering valid and missing/foreign/multiple scopes, wrong identity/path/payload, unsafe HTML, expiry and noindex metadata. Run RED.
- [x] Implement lib/editorial/malaysia-editorial-contracts.ts (registry), lib/wordpress/editorial-v01-{dto,queries}.ts and shared renderer/route/SEO. Query variables include pageId and siteScope.
- [x] Implement wordpress/plugins/tio2-site-model/includes/editorial-v01.php with exact-scope CPT/meta validation, read-only GraphQL resolver and safe admin edit path. Add bounded seed with plan/apply and rollback ledger.
- [x] Extend only relevant route proxy/cache revalidation/webhook dispatch; test invalidation isolation. Codegen schema from isolated CMS.
- [x] Run focused unit/integration/PHP tests GREEN and record results.

## Task 3: Actual runtime and receipt

- [x] Use task-owned local CMS/runtime ports, logs and Next build directory. Seed nine records into isolated local CMS after plan audit; capture sanitized readback identity and payload hashes.
- [x] Run lint/typecheck/target build and Playwright at 1440/768/390; inspect all screenshots, keyboard anchors/menu/Cookie, table reflow, 200% zoom/reduced motion, receiver navigation (no real submission), seven-surface isolation and failures.
- [x] Compare every AC to actual evidence; keep external receivers, unavailable related pages, native devices and publication prerequisites explicitly open.
- [x] Independent code review, scoped fixes and rechecks; final code commit and per-page receipt including base/final identities, source mapping, evidence, dependencies and rollback. Do not label self-check Gate 9 PASS.

## Execution ledger

- Ruling: Approved design/package reused; no new business/visual approval requested. User explicitly authorized continued implementation.
- Ruling: Branch from 2c97fe1 to inherit committed shared Chrome fixes without absorbing concurrent Poland/Brazil uncommitted code. Other task pages are baseline consumers, not newly delivered here.
- Ruling: Source freshness agent and Application intake agent are independent read-only subtasks; implementation owner controls shared files and runtime.
- Preflight: Task 1 produces registry-compatible configs/styles/routes; Task 2 consumes them via explicit interface above. Task 3 consumes runtime from Tasks 1–2. Shared files owned by parent only. No conflicting mutation ownership.
- Completed 2026-09-08: runtime code b325aec6b5121f2ded604bcf3afad7886515990f, BUILD_ID UV4ipmsCJ7cj7M2EHPfID, local Next 3216 / WordPress 8186 / Docker tio2my9. Nine CMS records restored to exact approved bytes after state exercises.
- Verification: 426 relevant tests across 44 files; TypeScript, changed-file lint, PHP syntax/parity and target webpack build passed. All 16 planned browser scenarios have final passing evidence across documented runs. All 27 responsive screenshots, 22 native full-body segments and 18 final native menu/RFQ captures actually reviewed. Final test-only capture helper uses software compositor; no production code change after b325aec.
- Handoff: 121 ACs and 66 dependencies mapped in the receipt evidence directory. Related Applications/Brazil market routes, provisional URL decisions, real receiver verification, other browser/device/assistive-technology coverage and independent Gate 9/Gate 10 remain explicitly open. No remote integration or deployment performed.
