# Site A Technical Resources Page System Production Design

**Date:** 2026-08-30  
**Status:** Ready for user review  
**Site:** Site A — TIOVAR main brand site  
**Language / market:** English / Global B2B  
**Visual authority:** approved representative prototype in `docs/prototypes/site-a-resources/`  
**Content authority:** `D:\11SEO\01ComInfo\outputs\site-a-resources-v0.1.json`  
**Validated content SHA-256:** `79b1db75441861ff2ae8db5bb284cc20887bd9134802b7d6b296b9d377d100ec`

## 1. Decision summary

Site A will use one shared TIOVAR visual language and three explicit Technical Resources page modes:

1. **Resources Hub** helps a customer identify whether the current question concerns material fundamentals, performance interpretation, grade replacement, or application testing.
2. **Technical Explainer** answers what a concept or metric means, what it can indicate, what it cannot establish, and how it should be validated.
3. **Evaluation Guide** converts a technical question into a fair, controlled, executable evaluation plan.

The approved system is not a generic renderer that prints WordPress fields in stored order. Next.js owns the composition, hierarchy, responsive behavior, CTA policy, and safe-link behavior for each mode. WordPress remains the structured content source.

The six approved final-review views are the visual baseline:

- `docs/prototypes/site-a-resources/review-final/resources-hub-desktop.png`
- `docs/prototypes/site-a-resources/review-final/resources-hub-mobile.png`
- `docs/prototypes/site-a-resources/review-final/alternative-grade-evaluation-guide-desktop.png`
- `docs/prototypes/site-a-resources/review-final/alternative-grade-evaluation-guide-mobile.png`
- `docs/prototypes/site-a-resources/review-final/oil-absorption-technical-explainer-desktop.png`
- `docs/prototypes/site-a-resources/review-final/oil-absorption-technical-explainer-mobile.png`

The user approved the representative Hub, Evaluation Guide, and Technical Explainer after the final overview-width and guide-navigation adjustments. That approval allows the system to be specified for all 11 pages. It does not authorize publication, deployment, indexing, remote WordPress writes, or homepage navigation changes.

## 2. Authority and conflict order

Implementation decisions follow this precedence:

1. current user instructions and the repository `AGENTS.md`;
2. this approved production design after user sign-off;
3. the approved final representative prototype;
4. validated Resource content and relationship data;
5. the existing Resource DTO, protected-preview, route-gating, SEO, and safety infrastructure;
6. older generic Resource templates and CSS only where they do not conflict with the approved composition.

The old green/copper editorial styling and field-order stacking renderer are not approved visual or composition authorities.

## 3. Scope

### 3.1 Included

- Site A only.
- One Resources Hub and ten English Technical Resource articles.
- One shared visual system with three explicit page compositions.
- Protected, signed, `noindex, nofollow` local preview behavior.
- Structured WordPress content read through the existing validation and DTO boundary.
- Metadata, JSON-LD, FAQ parity, accessibility, responsive behavior, and safe internal linking.
- Focused implementation tests and desktop/mobile browser verification.

### 3.2 Excluded

- Site B business-page or template work.
- Public Resource route activation.
- Homepage links to Products, Applications, or Resources.
- Navigation, sitemap, robots, DNS, deployment, production WordPress, remote writes, or indexing changes.
- PDF or TDS downloads, automatic grade recommendation, file upload, pricing, inventory, or unsupported performance claims.
- Disclosure of private TDS files, local paths, supplier/manufacturer/legal identity, original manufacturer grades, or contact details not already approved for public use.
- `verify:root-only`.

## 4. Canonical page inventory and mode assignment

Presentation mode is a Next-owned deterministic classification derived from the canonical Resource identity. It is not an editor-selectable WordPress layout field in v0.1.

| ID | Canonical path | Learning path | Page mode |
| --- | --- | --- | --- |
| `resources-hub` | `/resources` | Hub | Resources Hub |
| `article-01` | `/resources/rutile-vs-anatase-titanium-dioxide` | TiO₂ Fundamentals | Technical Explainer |
| `article-02` | `/resources/chloride-vs-sulfate-titanium-dioxide` | TiO₂ Fundamentals | Technical Explainer |
| `article-03` | `/resources/tio2-content-vs-performance` | TiO₂ Fundamentals | Technical Explainer |
| `article-04` | `/resources/titanium-dioxide-oil-absorption` | Performance Interpretation | Technical Explainer |
| `article-05` | `/resources/cbu-titanium-dioxide-meaning` | Performance Interpretation | Technical Explainer |
| `article-06` | `/resources/titanium-dioxide-surface-treatment` | Performance Interpretation | Technical Explainer |
| `article-07` | `/resources/evaluate-titanium-dioxide-alternative` | Grade Replacement | Evaluation Guide |
| `article-08` | `/resources/reduce-tio2-cost-high-pvc-paint` | Application Testing | Evaluation Guide |
| `article-09` | `/resources/titanium-dioxide-polycarbonate-yellowing` | Application Testing | Evaluation Guide |
| `article-10` | `/resources/titanium-dioxide-outdoor-durability` | Application Testing | Evaluation Guide |

The existing content manifest uses the stored cluster value `Performance` for articles 04–06. The visible Hub learning-path label is **Performance Interpretation**. This is a presentation label, not a mutation of the canonical stored identity.

Unknown IDs must not fall through to an arbitrary article template. They fail validation or render an explicit safe error in protected preview.

## 5. Page responsibility and keyword boundary

### 5.1 Resources Hub

**Owns:** discovery by customer question, educational orientation, and the four learning paths.  
**Does not own:** product ranking, one-click grade recommendation, application-specific formulation selection, or a chronological article feed.

The Hub answers: “Which type of technical question am I trying to solve, and which guide should I read next?”

### 5.2 Technical Explainer

**Owns:** definitions, interpretation, limitations, system implications, comparisons, misconceptions, and practical validation.  
**Does not own:** detailed end-use selection already covered by Applications, or SKU fit/evidence already covered by Products.

The Explainer answers: “What does this concept or metric mean, what can it tell me, and what can it not prove?”

### 5.3 Evaluation Guide

**Owns:** problem definition, required inputs, controls, staged testing, measurements, decision criteria, failure modes, adjustment boundaries, and approval steps.  
**Does not own:** unsupported equivalence, universal rankings, or a claim that a powder specification proves finished-product performance.

The Evaluation Guide answers: “How do I establish a fair and executable test plan for this decision?”

### 5.4 Boundaries with adjacent systems

| System | Primary customer intent | Content it owns |
| --- | --- | --- |
| Resources | Learn and evaluate | Concepts, interpretation, test design, limitations |
| Applications | Select for an end use | Application context, formulation/process considerations, application validation |
| Products | Assess a TIOVAR grade | Grade fit, evidence, product facts, qualified TDS/enquiry action |

Pages may summarize adjacent context only to orient the reader. They must link to the owning page instead of copying substantial sections or competing for the same primary keyword intent.

## 6. Customer reading paths

### 6.1 Hub path

1. Arrive with a technical question rather than a known article title.
2. Read the direct scope statement and decision summary.
3. Choose one of four question types.
4. Compare the guides within that learning path.
5. Read guidance on how to use technical information as evidence.
6. Continue to a related Resource, Application, Product, or technical discussion only when relevant.

### 6.2 Explainer path

1. Get a direct answer before detailed theory.
2. Scan four key conclusions.
3. Use the six-item guide navigation on desktop.
4. Understand meaning, limits, system impact, comparison, misconceptions, and validation.
5. Follow only semantically related content.
6. End with technical consultation; show TDS request only when a concrete related Product exists.

### 6.3 Evaluation path

1. Define the decision and identify the current control.
2. Collect the required formulation, process, and acceptance inputs.
3. Hold comparison variables constant.
4. Move through the staged evaluation framework.
5. Measure against explicit decision criteria.
6. Interpret failure without over-adjusting the candidate.
7. Complete production-representative and finished-product approval.
8. Discuss the evaluation with useful inputs already prepared.

## 7. Frozen visible composition

The following sequences are structural contracts. Empty optional modules collapse completely; they do not leave blank bands, placeholder cards, or empty headings.

### 7.1 Resources Hub order

1. Site header.
2. Breadcrumb.
3. Hub hero: eyebrow, H1, trust metadata, direct Resource scope, and decision-summary visual.
4. Four-step decision rail.
5. “Choose Your Technical Question” topic orientation.
6. Four learning paths in customer-task order:
   - TiO₂ Fundamentals — articles 01–03;
   - Performance Interpretation — articles 04–06;
   - Grade Replacement — article 07;
   - Application Testing — articles 08–10.
7. “How to Use These Guides” three-step evidence path and technical boundary strip.
8. “Three Mistakes to Avoid When Using Technical Guides.”
9. Related Products and Applications, limited to validated targets.
10. “Discuss Your Evaluation” CTA.
11. FAQ.
12. Technical boundary/disclaimer.
13. Site footer.

The Hub never sorts by publish date or article number. Article numbers are visual reference markers only.

### 7.2 Technical Explainer order

1. Site header and breadcrumb.
2. Hero with direct answer and decision-summary visual.
3. Decision rail: Answer → Interpret → Compare → Validate.
4. Compact overview:
   - left: “In this guide” plus six numbered anchor links only;
   - right: “Key conclusions” in a two-column grid of four conclusions;
   - right bottom: a compact planning-guidance strip.
5. Six concept modules in this intent order:
   - Direct answer;
   - Meaning and limits;
   - System impact;
   - Comparison;
   - Common misconceptions;
   - Practical validation.
6. Topic-specific comparison or worked-example module when supported by the content.
7. Practical product/formulation implications.
8. Interpretation guardrails / common mistakes.
9. Practical validation method.
10. Related Resources, Applications, and Products, grouped by target type where useful.
11. Final “Discuss Your Evaluation” CTA; optional “Request a TDS” only under the rule in section 11.
12. FAQ.
13. Technical boundary/disclaimer.
14. Site footer.

### 7.3 Evaluation Guide order

1. Site header and breadcrumb.
2. Hero with problem definition and decision-summary visual.
3. Decision rail: Define → Control → Evaluate → Approve.
4. Compact overview using the same balanced two-column structure as the Explainer.
5. Current control / evaluation question.
6. Controlled comparison sequence.
7. Six-stage grade-replacement or topic-specific evaluation framework.
8. Same-formulation laboratory screen.
9. Cross-application or topic-specific scorecard.
10. Application interpretation and measurement criteria.
11. When TDS or powder-data comparison is not enough.
12. Practical implications and permitted adjustment boundaries.
13. Common failure modes and interpretation guardrails.
14. Production-representative and finished-product approval method.
15. Related Products, Applications, and Resources.
16. Final “Discuss Your Evaluation” CTA.
17. FAQ.
18. Technical boundary/disclaimer.
19. Site footer.

The article-07 six-stage framework and scorecard are approved examples of the Evaluation Guide composition. Articles 08–10 reuse the evaluation grammar, but their headings, measurements, and criteria come from their own validated content rather than grade-replacement copy.

## 8. Visual system

### 8.1 Shared language

- Navy `#0A1F44`, secondary navy `#112D59`, ink `#10203A`.
- Muted body text `#48566B`, steel `#657185`, silver `#C7CCD3`, rule `#E1E5EA`, ice `#F4F6F8`, white `#FFFFFF`, focus `#4F82C4`.
- Space Grotesk for headings and structured labels; Source Sans 3 for body copy.
- White and ice surfaces dominate. Deep navy is reserved for technical guardrails, CTA emphasis, and decisive visual moments.
- Thin rules, restrained borders, numbered structures, and compact labels establish hierarchy. Avoid ornamental shadows, rounded-card repetition, decorative gradients unrelated to information structure, or sales-led imagery.
- The production pages reuse the approved Site A header/footer primitives and typography loading rather than importing Google Fonts from the static prototype.

### 8.2 Width hierarchy

- Global maximum content width: `1180px`.
- Article primary text modules: maximum `1000px` outer width, with readable prose internally constrained where necessary.
- Medium decision sequences: `1060px`.
- Wide frameworks and worked examples: `1120px`.
- Full scorecards and relationship grids: `1180px`.

This width system is intentional. The final review removed the long desktop “empty left column” caused by treating the guide navigation as a full-page sticky sidebar.

### 8.3 Compact article overview

- Desktop overview grid: `230px` navigation plus the remaining conclusion area.
- “In this guide” contains only its title and six links; explanatory guidance belongs under the right-side conclusions.
- Guide title: approximately `17px`.
- Guide link number and text: `0.9rem` (`14.4px`) with `1.45` line height.
- Each guide link retains a minimum `44px` interactive height.
- Key conclusions use two columns on wide desktop and collapse to one column when space is insufficient.
- At `900px` and below, the desktop guide navigation is hidden rather than occupying a sparse column. The right-side guidance strip is also removed at that breakpoint.

### 8.4 Responsive behavior

The review baselines are `1440px` desktop and `390px` mobile.

- No page-level horizontal overflow at any supported width.
- At narrower desktop/tablet widths, header navigation becomes an accessible menu and multi-column content collapses progressively.
- At `700px` and below, article modules become a single-column card-like reading stream on an ice background, with clear top rules and reduced spacing.
- Data tables may use contained horizontal scrolling; the page itself may not scroll horizontally.
- Evaluation stages and scorecards switch from dense desktop grids/tables to accessible disclosure groups on mobile.
- Hub learning paths become one column without changing their semantic order.
- Related link rows become one column on mobile.
- `prefers-reduced-motion` disables smooth scrolling and transitions.

## 9. Production component architecture

### 9.1 Mode resolution

Add a typed, exhaustively tested presentation resolver:

- `resources-hub` → `hub`;
- `article-01` through `article-06` → `technical-explainer`;
- `article-07` through `article-10` → `evaluation-guide`.

This resolver operates after schema/DTO validation and before composition. It must be exhaustive over `SITE_A_RESOURCE_IDENTITIES`. Adding a future Resource requires an explicit mode decision and test update.

### 9.2 Explicit composers

Use three separate top-level composers:

- `ResourcesHubPage`;
- `TechnicalExplainerPage`;
- `EvaluationGuidePage`.

They may share stable primitives such as:

- Resource hero and decision rail;
- compact article overview;
- numbered section frame;
- learning-path list;
- stage framework;
- responsive scorecard;
- related-content rows;
- technical enquiry CTA;
- FAQ and boundary modules.

Do not create a mega-component controlled by dozens of `if` statements or a generic loop that emits fields in DTO order. Each composer owns its visible sequence.

### 9.3 Content-to-module mapping

WordPress/DTO fields provide content; the composer provides placement. A small typed presentation model may normalize:

- mode;
- display learning-path label;
- overview anchor labels;
- section role and anchor ID;
- optional comparison/scorecard presence;
- grouped related links;
- CTA visibility.

The production mapping must use IDs, typed roles, or explicit registry entries. It must not use brittle runtime string replacement against body HTML.

## 10. Content integrity and reconciliation

The validated JSON contains 11 complete records and passed the strict Resource manifest validator on 2026-08-30. It is the technical-fact authority for implementation.

The approved prototype includes presentation edits such as shortened navigation labels, display headings, grouped related-content summaries, and article-07/article-04 module transformations. Before production rendering:

1. inventory every prototype-only display string or transformation;
2. classify it as either non-factual interface copy, faithful derived summary, or substantive editorial copy;
3. keep non-factual labels in a typed presentation registry;
4. reconcile substantive public copy with the approved manifest/editorial source through an explicit reviewed content change;
5. never silently rewrite technical facts in a React component or with `.replace()`.

No implementation task may infer or strengthen equivalence, ranking, durability, cost, regulatory, or finished-performance claims beyond the validated source.

## 11. CTA and conversion rules

Technical education remains primary. The article body does not repeat sales buttons between sections.

### 11.1 Primary CTA

The final CTA for all three modes is **Discuss Your Evaluation** or the mode-equivalent approved technical discussion label. The CTA asks for useful technical inputs so the conversation starts with the formulation, process, current control, candidate, test data, and decision criteria where relevant.

### 11.2 Request a TDS

“Request a TDS” is visible only when all conditions are true:

1. the Resource has at least one explicit, validated related Product;
2. the CTA context makes clear which related TIOVAR Product is involved;
3. the action is an enquiry/request, not a file download;
4. no private TDS path or URL is emitted.

Consequences for the approved representatives:

- Hub: no TDS action.
- Article 07: no TDS action because no related Product is declared.
- Article 04: TDS request may appear because explicit related Products exist.

A content-provided TDS CTA that does not satisfy these rules is filtered by the presentation policy and covered by a contract test.

### 11.3 Prohibited conversion patterns

- No automatic recommendation or “best grade” claim.
- No file upload.
- No public PDF/TDS download.
- No sticky sales rail or repeated inline CTA.
- No fabricated form endpoints or contact details.

## 12. Internal linking rules

- Links are thematic and intent-based, not mechanically reciprocal.
- Resources link to adjacent Resources for learning continuity, to Applications for end-use selection context, and to Products for explicit grade evidence.
- The Hub organizes Resource children by the four approved learning paths rather than stored order.
- Relationship labels and descriptions must make the next-page purpose clear.
- Render an anchor only when the target path is authorized for the current preview/public context.
- If a declared target is closed, unresolved, or not visible in the current context, suppress the anchor or render non-interactive text; never emit a dead link, public placeholder, or protected-preview URL as a public destination.
- Homepage content and homepage links remain unchanged.
- Header/footer/nav behavior remains governed by the existing Site A shell; this work does not activate a new public Resource navigation destination.

## 13. SEO, GEO, and structured data

### 13.1 Metadata

- Each page uses its validated unique SEO title and description.
- Canonical identity remains the approved public path, but protected preview responses must not present preview URLs as canonical identities.
- Hub Open Graph type is website; article modes use article metadata where supported.
- Dates are emitted only when they are strict validated UTC instants.

### 13.2 Structured data

- Hub primary type: `CollectionPage`.
- Article primary type: `TechArticle` unless a later evidence-based decision changes it to `Article`.
- Breadcrumbs include only visible/authorized destinations.
- Related links include only visible/authorized canonical targets.
- FAQ JSON-LD must be generated from the same FAQ data rendered visibly on the page; hidden or schema-only FAQs are prohibited.
- JSON-LD text is normalized and safely serialized through the existing SEO helpers.

### 13.3 GEO-oriented answer structure

- Put a concise direct answer near the top.
- Use clear semantic headings, explicit limitations, and answerable FAQs.
- Preserve tables, stage criteria, and comparison context as semantic HTML.
- Do not add an obsolete meta-keywords field or stuff repeated query phrases.

### 13.4 Preview indexing

All Resource preview pages remain authenticated/protected and return `noindex, nofollow`. Public Resource routes remain disabled and must gate before any WordPress query.

## 14. Security and safety invariants

- Site scope is enforced as Site A at query, DTO, route, relationship, and render boundaries.
- Anonymous access to protected drafts is rejected.
- Preview authorization remains scoped to the requested Resource path.
- No public route can be enabled by a query parameter, client state, or prototype toggle.
- Rich text is sanitized through the existing allowlist before rendering.
- Relationship targets are normalized internal paths; external or malformed targets are rejected unless explicitly supported by the existing contract.
- Source scans must find no local path, private TDS URL, manufacturer/supplier/legal identity, price, inventory, original grade, or unsupported guarantee leakage.
- Site B invariant files and behavior remain unchanged.
- Failure is closed: do not substitute another Site, another Resource, generic copy, or an unsafe link.

## 15. Accessibility and interaction

- Exactly one H1 per page; headings follow semantic order.
- Landmark elements, breadcrumbs, navigation, main content, related content, and footer retain meaningful labels.
- All actionable controls meet a minimum `44px` target size.
- Focus is visible with the approved focus color and is not removed without an equivalent replacement.
- “In this guide” anchors target stable IDs and account for sticky-shell offset.
- Disclosure controls use native `details`/`summary` or equivalent keyboard-accessible semantics.
- Tables use proper headers and an accessible scroll region when overflow is required.
- Mobile menu exposes correct `aria-expanded` and `aria-controls` state.
- Decorative technical graphics are hidden from assistive technology; meaningful summaries remain text.
- Color is never the only carrier of state or meaning.

## 16. Failure and empty-state behavior

- Missing required content or invalid mode mapping: stop rendering and surface a protected diagnostic; do not ship a partial public page.
- Missing optional comparison, scorecard, related group, or CTA action: remove the complete module and close surrounding spacing.
- Missing/closed relationship target: suppress the link as defined in section 12.
- Empty FAQ list: fail validation because the approved content contract requires complete FAQs.
- Table too wide: use contained horizontal scrolling on desktop and approved mobile disclosure presentation where defined.
- WordPress/readback mismatch: report the exact field; do not repair automatically.
- Content/prototype conflict involving a technical fact: preserve validated content and return the copy difference for explicit editorial review.

## 17. Testing and verification strategy

Implementation follows TDD and focused review. Tests are written to fail before each production behavior is added.

### 17.1 Contract and mode tests

- Exact 11-ID manifest validation.
- Exhaustive ID-to-mode mapping.
- Four Hub learning paths with counts `3 / 3 / 1 / 3` in the approved order.
- Unknown ID rejection.
- CTA filtering, especially no Product → no TDS request.
- Safe related-link filtering and grouping.
- No runtime body-string replacement for production composition.

### 17.2 Component and composition tests

- Each mode renders its frozen module order.
- Optional modules collapse without empty shells.
- Desktop compact overview has six anchors and four key conclusions for the representative articles.
- The approved article-04 worked examples and article-07 stage/scorecard modules render from typed data.
- Mobile stage and scorecard alternatives preserve the same information.
- FAQ visible content and JSON-LD remain in parity.

### 17.3 Route, SEO, and security tests

- Public gate runs before WordPress data access.
- Anonymous preview is rejected.
- Authorized preview renders and returns `noindex, nofollow`.
- Metadata and JSON-LD use canonical Resource identity without exposing preview URLs.
- Closed targets do not become anchors or JSON-LD related links.
- No homepage, sitemap, navigation, Site B, or public-route inventory change.
- Leakage scans return zero prohibited findings.

### 17.4 Browser and visual verification

- First compare production rendering of the three representatives against the six approved final screenshots at `1440px` and `390px`.
- Verify no console/server errors, clipped text, overlapping controls, page horizontal overflow, or unreachable content.
- Verify compact overview balance and `14.4px` guide-link typography on both article modes.
- Verify keyboard navigation, anchor movement, disclosures, focus visibility, and reduced-motion behavior.
- After shared templates pass, crawl the remaining eight protected Resource previews at desktop and mobile sizes and inspect long headings, tables, related-link counts, and optional-module combinations.

Focused Resource tests, one Site A build when necessary, and a small set of critical protected-preview E2E tests are permitted. `verify:root-only` is not permitted in this stage.

## 18. Implementation sequence after design approval

1. User approves or amends this specification.
2. Invoke `superpowers:writing-plans` and produce the task-level implementation plan.
3. Before code changes, read the relevant Next.js 16 guides from this repository's `node_modules/next/dist/docs/`.
4. Confirm isolated-worktree status and preserve all unrelated user changes.
5. Use TDD to add presentation-mode resolution and content reconciliation rules.
6. Build shared primitives and the three explicit composers.
7. Connect the three approved representative pages to protected preview and compare them to the approved desktop/mobile baseline.
8. Expand the already approved system to the remaining eight pages through their assigned mode, with focused tests and per-task review.
9. Run focused SEO, security, accessibility, content-leakage, and protected-preview verification.
10. Request code review and apply review feedback rigorously.
11. Use `verification-before-completion` before any completion claim.
12. Stop with all public Resource routes still disabled and no deployment or remote write performed.

## 19. Acceptance criteria

The implementation is conformant only when:

- all 11 validated records render through the correct explicit mode;
- the Hub uses the four approved learning paths and counts;
- Technical Explainers and Evaluation Guides preserve their distinct customer tasks and module orders;
- the three representative production pages match the approved visual baseline on desktop and mobile;
- the overview guide is compact, uses `0.9rem` link text, and does not create multi-screen empty side columns;
- the remaining eight pages inherit the system without generic field-order stacking;
- technical facts remain traceable to the validated source and no runtime string replacement silently edits substantive copy;
- CTA and TDS visibility obey the relationship rules;
- internal links resolve only to authorized visible targets;
- FAQ, metadata, JSON-LD, accessibility, and responsive requirements pass focused tests;
- anonymous preview access remains blocked and preview pages remain `noindex, nofollow`;
- public routes, homepage links, sitemap, navigation, Site B, remote WordPress, deployment, DNS, and indexing remain unchanged;
- prohibited-content scans return zero findings;
- no `verify:root-only` command is run.

## 20. Review gate

This document is the final design gate before implementation planning. No production code is authorized by this document alone. After user approval, the next artifact is the formal `writing-plans` implementation plan; coding begins only after that plan is reviewed under the agreed workflow.
