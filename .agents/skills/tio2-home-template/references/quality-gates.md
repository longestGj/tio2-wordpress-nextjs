# Homepage quality gates

Read this reference before Implement work or Audit.

## Approval and TDD gate

Implement requires all four fields: proposal ID, exact proposal artifact/path, verbatim user approval quote, and accepted scope/decisions. Unsupported prior-approval claims do not pass. Audit requires proposal ID plus exact artifact/path and remains read-only.

For each behavior change, capture a focused failing test before production edits, confirm it fails for the missing behavior, implement the minimum approved behavior, and capture the passing result. Tests exercise observable contracts, not source-text presence or mock existence.

## WordPress and data gates

- Verify CPT registration, exact GraphQL names, every stable field key, bounded cardinality, fixed `homepage-v0.1`, fixed `/`, deterministic `${siteId}--homepage`, and at most one non-revision/non-autosave record per site across all statuses.
- Admin, ACF, REST/WP-CLI, and programmatic writes apply the same final constraints. Verify reversible old-root migration and rollback.
- Verify bounded GraphQL mapping, required/optional failures, path/evidence validation, site isolation, published/draft separation, owning-site cache tags, Preview, webhook, and sitemap behavior.
- Verify stored Homepage dependencies accept one exact same-site `publish` or `draft` owner and reject missing, ambiguous, cross-site, malformed, root, trash, and private targets without rewriting or publishing them.
- Verify formal and Preview loaders inject the owning site's inventory-backed link policy, and Preview never makes a draft dependency publicly navigable.

## Component, SEO, and interaction gates

- Verify fixed section order, one H1, semantic headings/sections, optional metrics, native FAQ, images/alt behavior, inventory-aware internal links, and `HomepageDto`-only props.
- In root-only mode, verify Product/application cards remain non-interactive without link affordance, the Hero secondary CTA is absent, unavailable FAQ related links are absent, and both RFQ actions remain `#rfq` anchors.
- Verify every RFQ field, exact length/required rules, error summary and first-invalid focus, success clearing, and zero network, storage, cookie, WordPress, or third-party side effects.
- Verify current-site metadata, fixed canonical, OG fallback, `noindex, nofollow`, allowed JSON-LD types, and visible-content-equal `FAQPage`.

## Browser, accessibility, and performance gates

- Both sites show distinct site-owned content with no cross-site leakage.
- At 360, 768, and 1440 px, preserve DOM order and reject horizontal overflow. Verify keyboard order, visible unobscured focus, RFQ anchor, FAQ operation, 200% zoom, reduced motion, and minimum 44×44 CSS-pixel targets.
- Meet WCAG 2.2 AA. Axe has no serious or critical issues. Lighthouse Accessibility is exactly 100.
- Mobile Lighthouse Performance is at least 90.
- Homepage-owned incremental client JavaScript is at most 25 KB gzip (25,600 bytes) for each site.
- Browser tests reject unexpected remote requests.

## Regression and completion gates

- Build both `tio2-a` and `tio2-b` successfully.
- Read each site's expected public URL count from the versioned public route inventory; the approved initial count is one (`/`) per site.
- Verify Site A and Site B select distinct Homepage runtime entries: Site A remains active, while Site B's schema/template behavior is frozen and its conforming WordPress values remain editable.
- Preserve the approved root-only sitemap, robots, real 404, exact signed Preview, webhook, HTTP audit, and retained-draft behavior.
- Preserve all Product pages and the Product Agent/Skill contract; no Product-owned file changes.
- Run the complete `npm run verify:local` gate and then an independent read-only Audit against the approved proposal.
- Handoff includes mode, proposal ID, decisions, unresolved decisions, affected files/interfaces, fresh verification evidence, migration impact, and `external actions: none`.

The specialist never pushes, deploys, changes DNS, enables indexing, writes remotely, or touches production.
