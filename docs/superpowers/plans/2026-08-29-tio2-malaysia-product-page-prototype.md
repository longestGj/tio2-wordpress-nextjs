# TiO2 Malaysia Product Page Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, responsive Next.js prototype of the M-350 product detail page that demonstrates the approved 14-module template, evidence-gated rendering, and local RFQ interactions without touching either existing site or WordPress.

**Architecture:** Create a self-contained Next.js App Router application under `site-prototypes/tio2-malaysia-product-page`. Local typed M-350 data feeds reusable product components through a module-level visibility filter; one small client-side conversion layer handles CTA prefill and RFQ validation. The prototype has its own styles, tests, screenshots, and documentation, and imports no business code from the two existing sites.

**Tech Stack:** Next.js 16.2.6, React 19.2.6, TypeScript 5.9, CSS Modules/global CSS, Vitest 4.1.6, React Testing Library 16.3.2, Playwright 1.62.1.

**Spec:** `docs/superpowers/specs/2026-08-29-tio2-malaysia-product-page-prototype-design.md`

**Content reference:** `D:\23MySec\docs\product-pages\02_M350_Complete_Template_Example_V1.0.md`

## Global Constraints

- Work only in `site-prototypes/tio2-malaysia-product-page/`, plus this plan/spec documentation.
- Do not modify root `app/`, `components/`, `lib/`, `sites/`, `wordpress/`, Site A, or Site B.
- Do not connect to WordPress, WPGraphQL, a database, analytics, email, CRM, or any external form endpoint.
- Do not import business components, site configuration, or styles from the root project.
- The prototype route is `/products/m-350` and must remain `noindex, nofollow` with no production canonical or Product JSON-LD.
- Use only module-level `verified`, `pending_verification`, and `not_public` publication states.
- `pending_verification`, `not_public`, and missing statuses render no section, heading, anchor, empty container, or schema value.
- M-350 technical specifications, negative-use claims, and product-specific Malaysia-origin claims do not render in the baseline fixture.
- Do not copy body text from mytio2.com.
- The visual system is fixed to Inter, `#062B5B`, `#031B3A`, `#00A99D`, `#14B8A6`, `#FFFFFF`, `#F5F8FB`, `#D9E2EC`, and `#334155`.
- Website Domain is an optional RFQ field; when present it receives loose domain/URL validation.
- All form submission remains local and shows a simulated success state.
- Read the relevant files in `node_modules/next/dist/docs/01-app/` before writing Next.js code, especially project structure, CSS, metadata, robots, Vitest, and Playwright guidance.
- Do not run `verify:root-only`; it is unrelated to an isolated prototype.

---

## File Structure

```text
site-prototypes/tio2-malaysia-product-page/
├─ app/
│  ├─ globals.css                         # reset, tokens, shared typography and layout primitives
│  ├─ layout.tsx                          # root layout and noindex metadata
│  ├─ page.tsx                            # local entry with link to M-350
│  ├─ robots.ts                           # disallow all crawlers
│  └─ products/m-350/page.tsx             # M-350 route assembly
├─ components/
│  ├─ layout/site-header.tsx              # utility bar and site-neutral prototype navigation
│  ├─ layout/site-footer.tsx              # restrained local prototype footer
│  ├─ product/product-page.tsx            # section orchestration
│  ├─ product/product-page.module.css      # product page responsive styling
│  ├─ product/product-hero.tsx             # approved precision-white hero
│  ├─ product/in-page-nav.tsx              # anchors generated from visible sections
│  ├─ product/product-positioning.tsx      # positioning and decision points
│  ├─ product/application-grid.tsx         # application cards
│  ├─ product/recommendation-panel.tsx     # recommended and optional negative-use content
│  ├─ product/technical-specifications.tsx # future verified specification renderer
│  ├─ product/document-request.tsx         # neutral document enquiry choices
│  ├─ product/origin-support.tsx           # future product-specific origin module
│  ├─ product/market-support.tsx            # market route-state cards
│  ├─ product/related-grades.tsx           # up to three related grade cards
│  ├─ product/sample-request.tsx           # sample conversion section
│  ├─ conversion/enquiry-cta.tsx           # client CTA that selects enquiry type
│  └─ conversion/rfq-form.tsx              # client RFQ form and simulated submission
├─ data/m-350.ts                           # lean approved M-350 fixture
├─ lib/product/types.ts                    # shared page and module types
├─ lib/product/visibility.ts               # publication-state filtering and nav generation
├─ lib/conversion/rfq-validation.ts        # pure RFQ validation
├─ tests/
│  ├─ setup.ts                             # DOM cleanup
│  ├─ robots.test.ts                       # crawler blocking contract
│  ├─ visibility.test.ts                   # evidence-gating contract
│  ├─ product-page.test.tsx                # visible/hidden module rendering
│  ├─ rfq-validation.test.ts               # required and optional-domain validation
│  ├─ product-page.spec.ts                 # browser-level CTA, metadata and content checks
│  └─ responsive.spec.ts                   # viewport overflow and screenshot checks
├─ artifacts/                              # generated review screenshots
├─ docs/wordpress-adapter.md               # future WP field mapping
├─ .gitignore                              # build, dependency and test-output ignores
├─ next.config.ts                          # isolated Next.js configuration
├─ package.json                            # standalone scripts and exact dependency family
├─ playwright.config.ts                    # local web server and browser configuration
├─ tsconfig.json                           # strict TypeScript and local @/* alias
└─ vitest.config.ts                        # jsdom unit test configuration
```

---

### Task 1: Scaffold the isolated noindex Next.js application

**Files:**
- Create: `site-prototypes/tio2-malaysia-product-page/package.json`
- Create: `site-prototypes/tio2-malaysia-product-page/tsconfig.json`
- Create: `site-prototypes/tio2-malaysia-product-page/next.config.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/vitest.config.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/tests/setup.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/app/layout.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/app/page.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/app/robots.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/app/globals.css`
- Create: `site-prototypes/tio2-malaysia-product-page/.gitignore`
- Test: `site-prototypes/tio2-malaysia-product-page/tests/robots.test.ts`

**Interfaces:**
- Consumes: Next.js App Router file conventions and metadata APIs from the bundled Next.js documentation.
- Produces: standalone `dev`, `build`, `start`, `test`, and `test:e2e` commands; `robots(): MetadataRoute.Robots`; global visual tokens used by every later task.

- [ ] **Step 1: Write the failing crawler-blocking test**

```ts
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("prototype robots policy", () => {
  it("disallows all crawlers and publishes no sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });
});
```

- [ ] **Step 2: Run the test and verify the missing application fails**

Run from `site-prototypes/tio2-malaysia-product-page`:

```powershell
npm test -- --run tests/robots.test.ts
```

Expected: FAIL because `@/app/robots` and the prototype package do not exist yet.

- [ ] **Step 3: Create the standalone package and strict configurations**

Use these scripts in `package.json`:

```json
{
  "private": true,
  "scripts": {
    "dev": "next dev -p 3010",
    "build": "next build",
    "start": "next start -p 3010",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^16.2.6",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@playwright/test": "^1.62.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^22.15.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "jsdom": "26.1.0",
    "typescript": "^5.9.0",
    "vitest": "^4.1.6"
  }
}
```

Set `compilerOptions.strict` to `true`, `baseUrl` to `.` and `paths` to `{ "@/*": ["./*"] }`. Configure Vitest with an explicit local alias so it does not depend on an extra path plugin:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
```

Use this complete `tests/setup.ts`:

```ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

- [ ] **Step 4: Implement the root layout, local entry, robots policy and base tokens**

The root layout metadata must contain:

```ts
export const metadata: Metadata = {
  title: "TiO2 Malaysia Product Template Prototype",
  description: "Local review prototype for the M-350 product page template.",
  robots: { index: false, follow: false },
};
```

The robots function must return:

```ts
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
```

Define the approved tokens in `app/globals.css`:

```css
:root {
  --color-primary-navy: #062b5b;
  --color-deep-navy: #031b3a;
  --color-malaysia-teal: #00a99d;
  --color-accent-teal: #14b8a6;
  --color-white: #ffffff;
  --color-soft-background: #f5f8fb;
  --color-border-gray: #d9e2ec;
  --color-body-text: #334155;
  --content-width: 1200px;
  --radius-button: 7px;
  --radius-card: 12px;
}
```

Use an Inter-first system font stack without fetching a remote font. Root `/` links only to `/products/m-350` and identifies itself as a local review entry.

- [ ] **Step 5: Install the isolated package and run the unit test**

```powershell
npm install
npm test -- --run tests/robots.test.ts
```

Expected: one passing crawler-policy test.

- [ ] **Step 6: Run an initial production build**

```powershell
npm run build
```

Expected: Next.js build succeeds and lists `/`, `/robots.txt`, and no product route yet.

- [ ] **Step 7: Commit the scaffold without staging unrelated root files**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/package.json site-prototypes/tio2-malaysia-product-page/package-lock.json site-prototypes/tio2-malaysia-product-page/tsconfig.json site-prototypes/tio2-malaysia-product-page/next.config.ts site-prototypes/tio2-malaysia-product-page/vitest.config.ts site-prototypes/tio2-malaysia-product-page/tests/setup.ts site-prototypes/tio2-malaysia-product-page/tests/robots.test.ts site-prototypes/tio2-malaysia-product-page/app site-prototypes/tio2-malaysia-product-page/.gitignore
git commit -m "chore: scaffold isolated TiO2 product prototype"
```

---

### Task 2: Define the lean product model and evidence-gating contract

**Files:**
- Create: `site-prototypes/tio2-malaysia-product-page/lib/product/types.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/lib/product/visibility.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/data/m-350.ts`
- Test: `site-prototypes/tio2-malaysia-product-page/tests/visibility.test.ts`

**Interfaces:**
- Consumes: no runtime service; M-350 facts from the approved content reference.
- Produces: `PublishingStatus`, `ProductModule<T>`, `ProductPageData`, `SectionId`, `isModuleVisible()`, `getVisibleSectionIds()`, and `m350Product`.

- [ ] **Step 1: Write failing visibility tests**

```ts
import { describe, expect, it } from "vitest";
import { getVisibleSectionIds, isModuleVisible } from "@/lib/product/visibility";
import { m350Product } from "@/data/m-350";

describe("module visibility", () => {
  it.each([
    ["verified", true],
    ["pending_verification", false],
    ["not_public", false],
    [undefined, false],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(isModuleVisible(status)).toBe(expected);
  });

  it("omits unverified M-350 sections and keeps conversion sections", () => {
    expect(getVisibleSectionIds(m350Product)).toEqual([
      "positioning",
      "applications",
      "recommendations",
      "documents",
      "markets",
      "related-grades",
      "sample",
      "rfq",
    ]);
  });
});
```

- [ ] **Step 2: Run tests and verify the missing types fail**

```powershell
npm test -- --run tests/visibility.test.ts
```

Expected: FAIL because the product types and fixture are absent.

- [ ] **Step 3: Implement exact shared types**

Define these central contracts in `lib/product/types.ts`:

```ts
export type PublishingStatus =
  | "verified"
  | "pending_verification"
  | "not_public";

export type ProductModule<T> = {
  publishingStatus?: PublishingStatus;
  content: T;
};

export type SectionId =
  | "positioning"
  | "applications"
  | "recommendations"
  | "technical-specifications"
  | "documents"
  | "origin-support"
  | "markets"
  | "related-grades"
  | "sample"
  | "rfq";

export type ProductIdentity = {
  slug: string;
  model: string;
  primaryKeyword: string;
  productType: string;
  process: string;
};

export type ProductPageData = {
  identity: ProductIdentity;
  seo: {
    title: string;
    metaDescription: string;
  };
  hero: {
    eyebrow: string;
    h1: string;
    summary: string;
  };
  positioning: ProductModule<{
    heading: string;
    body: string;
    decisionPoints: string[];
  }>;
  applications: ProductModule<{
    heading: string;
    items: Array<{ title: string; body: string; routeKey: string }>;
  }>;
  recommendations: ProductModule<{
    heading: string;
    recommended: string[];
    notRecommended: string[];
    qualificationNote: string;
  }>;
  technicalSpecifications: ProductModule<{
    heading: string;
    rows: Array<{
      property: string;
      value: string;
      unit?: string;
      qualifier?: string;
    }>;
  }>;
  documents: ProductModule<{
    heading: string;
    body: string;
    requestTypes: string[];
  }>;
  originSupport: ProductModule<{
    heading: string;
    body: string;
  }>;
  marketSupport: ProductModule<{
    heading: string;
    body: string;
    markets: Array<{ label: string; routeKey: string }>;
  }>;
  relatedGrades: ProductModule<{
    heading: string;
    grades: Array<{ model: string; context: string }>;
  }>;
  sample: {
    heading: string;
    body: string;
  };
  rfq: {
    heading: string;
    body: string;
  };
};
```

Required conversion modules are plain objects; evidence-controlled modules use `ProductModule<T>`.

- [ ] **Step 4: Implement status filtering from a single section definition list**

```ts
export function isModuleVisible(status?: PublishingStatus): boolean {
  return status === "verified";
}

export function getVisibleSectionIds(product: ProductPageData): SectionId[] {
  const sections: Array<[
    SectionId,
    PublishingStatus | "required" | undefined,
  ]> = [
    ["positioning", product.positioning.publishingStatus],
    ["applications", product.applications.publishingStatus],
    ["recommendations", product.recommendations.publishingStatus],
    ["technical-specifications", product.technicalSpecifications.publishingStatus],
    ["documents", product.documents.publishingStatus],
    ["origin-support", product.originSupport.publishingStatus],
    ["markets", product.marketSupport.publishingStatus],
    ["related-grades", product.relatedGrades.publishingStatus],
    ["sample", "required"],
    ["rfq", "required"],
  ];

  return sections
    .filter(([, status]) => status === "required" || isModuleVisible(status))
    .map(([id]) => id);
}
```

- [ ] **Step 5: Add the approved lean M-350 fixture**

Use these exact baseline facts and statuses:

```ts
export const m350Product: ProductPageData = {
  identity: {
    slug: "m-350",
    model: "M-350",
    primaryKeyword: "M-350 titanium dioxide",
    productType: "Rutile titanium dioxide",
    process: "Chloride",
  },
  seo: {
    title: "M-350 Titanium Dioxide for Coatings | TiO2 Malaysia",
    metaDescription:
      "Evaluate M-350 titanium dioxide for decorative, industrial and automotive coatings or printing inks. Request technical review, a sample or an RFQ.",
  },
  hero: {
    eyebrow: "Rutile titanium dioxide · Chloride process",
    h1: "M-350 Rutile Titanium Dioxide for Coatings",
    summary:
      "A general chloride-process rutile grade for evaluation in decorative, industrial and automotive coatings and printing inks.",
  },
  positioning: {
    publishingStatus: "verified",
    content: {
      heading: "Where M-350 Fits",
      body:
        "M-350 is positioned as a general chloride-process rutile titanium dioxide grade for coating and ink formulation evaluation. Buyers should confirm fit against their resin system, dispersion process, performance targets and destination-document requirements.",
      decisionPoints: [
        "General rutile grade",
        "Chloride process",
        "Coatings and printing-ink evaluation direction",
        "Technical review, sample and RFQ path",
      ],
    },
  },
  applications: {
    publishingStatus: "verified",
    content: {
      heading: "Main Application Directions",
      items: [
        {
          title: "Decorative Coatings",
          body:
            "Evaluate M-350 for decorative coating formulations where a general chloride-process rutile grade is under consideration.",
          routeKey: "application_coatings",
        },
        {
          title: "Industrial Coatings",
          body:
            "Include M-350 in technical evaluation for industrial coating systems after confirming formulation and performance requirements.",
          routeKey: "application_coatings",
        },
        {
          title: "Automotive Coatings",
          body:
            "M-350 may be evaluated for automotive coating applications within the approved product direction, subject to formulation testing.",
          routeKey: "application_coatings",
        },
        {
          title: "Printing Inks",
          body:
            "M-350 may also be evaluated for printing-ink systems, with final suitability determined by the buyer's formulation and application testing.",
          routeKey: "application_printing_inks",
        },
      ],
    },
  },
  recommendations: {
    publishingStatus: "verified",
    content: {
      heading: "Recommended Evaluation Directions",
      recommended: [
        "Decorative-coating formulation evaluation",
        "Industrial and automotive coating formulation evaluation",
        "Printing-ink formulation evaluation",
      ],
      notRecommended: [],
      qualificationNote:
        "Final grade selection should be confirmed against the buyer's formulation, processing conditions, target performance and required documentation.",
    },
  },
  technicalSpecifications: {
    publishingStatus: "pending_verification",
    content: { heading: "Technical Specifications", rows: [] },
  },
  documents: {
    publishingStatus: "verified",
    content: {
      heading: "Request M-350 Documents",
      body:
        "Tell us which M-350 documents you need and the destination market. Our team will confirm the applicable document scope for your request.",
      requestTypes: [
        "Technical Data Sheet",
        "Safety Data Sheet",
        "Certificate of Analysis",
        "Certificate of Origin",
        "REACH-related documents",
        "Other technical or export document",
      ],
    },
  },
  originSupport: {
    publishingStatus: "pending_verification",
    content: { heading: "Malaysia-Origin Support", body: "" },
  },
  marketSupport: {
    publishingStatus: "verified",
    content: {
      heading: "Procurement Support for Your Destination",
      body:
        "Select the relevant destination page for market-specific procurement, document and inquiry guidance.",
      markets: [
        { label: "European Union", routeKey: "market_eu" },
        { label: "United Kingdom", routeKey: "market_uk" },
        { label: "India", routeKey: "market_india" },
        { label: "Brazil", routeKey: "market_brazil" },
      ],
    },
  },
  relatedGrades: {
    publishingStatus: "verified",
    content: {
      heading: "Other Coatings Grades to Review",
      grades: [
        {
          model: "M-510",
          context:
            "Multi-application coatings grade. Review the M-510 page when evaluating another coating-focused product direction.",
        },
        {
          model: "M-896",
          context:
            "Industrial and weather-resistant coatings grade. Review verified M-896 information for industrial coating selection.",
        },
        {
          model: "M-895",
          context:
            "Architectural and industrial coatings grade. Review verified M-895 information for another coatings direction.",
        },
      ],
    },
  },
  sample: {
    heading: "Request an M-350 Sample",
    body:
      "Share your formulation or application objective, destination and expected purchase context so the sample request can be reviewed.",
  },
  rfq: {
    heading: "Request a Quote for M-350",
    body:
      "Provide your destination, application, estimated quantity, packaging requirement and requested documents for a relevant quotation review.",
  },
};
```

Do not add specification rows, negative-use items, origin copy, packaging facts, prices, MOQ, stock, lead time, or registration claims.

- [ ] **Step 6: Run the visibility tests and TypeScript check**

```powershell
npm test -- --run tests/visibility.test.ts
npx tsc --noEmit
```

Expected: visibility tests pass and TypeScript reports no errors.

- [ ] **Step 7: Commit the data contract**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/lib/product site-prototypes/tio2-malaysia-product-page/data/m-350.ts site-prototypes/tio2-malaysia-product-page/tests/visibility.test.ts
git commit -m "feat: add evidence-gated M-350 data model"
```

---

### Task 3: Build the approved site shell and precision-white hero

**Files:**
- Create: `site-prototypes/tio2-malaysia-product-page/components/layout/site-header.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/layout/site-footer.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/product-hero.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/product-page.module.css`
- Create: `site-prototypes/tio2-malaysia-product-page/app/products/m-350/page.tsx`
- Test: `site-prototypes/tio2-malaysia-product-page/tests/product-page.test.tsx`

**Interfaces:**
- Consumes: `ProductPageData["hero"]`, `ProductPageData["identity"]`, and the global visual tokens.
- Produces: `SiteHeader`, `SiteFooter`, and `ProductHero` components; reviewable `/products/m-350` route.

- [ ] **Step 1: Write a failing semantic hero test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductHero } from "@/components/product/product-hero";
import { m350Product } from "@/data/m-350";

describe("ProductHero", () => {
  it("renders one approved H1 and both conversion actions", () => {
    render(<ProductHero product={m350Product} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "M-350 Rutile Titanium Dioxide for Coatings",
    );
    expect(
      screen.getByRole("link", { name: "Request an M-350 Quote" }).getAttribute("href"),
    ).toBe("#rfq");
    expect(
      screen.getByRole("link", { name: "Request an M-350 Sample" }).getAttribute("href"),
    ).toBe("#rfq");
  });
});
```

- [ ] **Step 2: Run the test and verify the missing hero fails**

```powershell
npm test -- --run tests/product-page.test.tsx
```

Expected: FAIL because `ProductHero` is not defined.

- [ ] **Step 3: Implement the header and breadcrumb without site binding**

The header must render:

- A narrow Deep Navy utility bar.
- Text-only prototype identity `TiO2 Malaysia` with a simple geometric mark; no claim that it is the final logo.
- Navigation labels Products, Applications, Markets, Process, and Documents as non-production visual states.
- A `Request a Quote` link to `#rfq`.
- Breadcrumb `Home / Products / M-350` immediately below navigation.

Do not import either existing site's header, footer, site config, domain, or route inventory.

- [ ] **Step 4: Implement the approved hero markup**

Use one H1, evidence-safe summary copy, two enquiry links, and three procedural support notes. The visual column must label its illustrated bag as a review asset requiring approved product photography, and must not imply that the illustration is the real M-350 package.

Hero CSS contract:

```css
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(380px, 0.95fr);
  gap: 5rem;
  min-height: 38rem;
  align-items: center;
}

.heroTitle {
  color: var(--color-primary-navy);
  font-size: clamp(3.25rem, 5vw, 4rem);
  line-height: 1.04;
}

.primaryAction {
  background: var(--color-malaysia-teal);
  border-radius: var(--radius-button);
  color: var(--color-white);
}
```

At widths below 760px, change the hero to one column, keep copy before the visual, and use `clamp(2.375rem, 12vw, 2.75rem)` for the H1.

- [ ] **Step 5: Assemble the initial M-350 route**

`app/products/m-350/page.tsx` must export route-level metadata with `robots: { index: false, follow: false }`, render `SiteHeader`, `ProductHero`, and `SiteFooter`, and use only `m350Product` as its data source.

- [ ] **Step 6: Run hero tests, TypeScript and build**

```powershell
npm test -- --run tests/product-page.test.tsx
npx tsc --noEmit
npm run build
```

Expected: test passes; build lists `/products/m-350` and emits no WordPress/network errors.

- [ ] **Step 7: Commit the shell and hero**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/components/layout site-prototypes/tio2-malaysia-product-page/components/product/product-hero.tsx site-prototypes/tio2-malaysia-product-page/components/product/product-page.module.css site-prototypes/tio2-malaysia-product-page/app/products/m-350/page.tsx site-prototypes/tio2-malaysia-product-page/tests/product-page.test.tsx
git commit -m "feat: build approved M-350 product hero"
```

---

### Task 4: Implement the reusable content modules and conditional navigation

**Files:**
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/product-page.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/in-page-nav.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/product-positioning.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/application-grid.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/recommendation-panel.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/technical-specifications.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/document-request.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/origin-support.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/market-support.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/related-grades.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/product/sample-request.tsx`
- Modify: `site-prototypes/tio2-malaysia-product-page/app/products/m-350/page.tsx`
- Modify: `site-prototypes/tio2-malaysia-product-page/tests/product-page.test.tsx`

**Interfaces:**
- Consumes: `getVisibleSectionIds(product)`, the typed M-350 module content, and conversion links to `#rfq`.
- Produces: `ProductPage({ product }: { product: ProductPageData })` with approved ordering and conditional omission.

- [ ] **Step 1: Extend the rendering test with visible and hidden headings**

```tsx
import { ProductPage } from "@/components/product/product-page";

it("renders M-350 modules in approved public order", () => {
  render(<ProductPage product={m350Product} />);

  const headings = screen
    .getAllByRole("heading", { level: 2 })
    .map((node) => node.textContent);
  expect(headings).toEqual([
    "Where M-350 Fits",
    "Main Application Directions",
    "Recommended Evaluation Directions",
    "Request M-350 Documents",
    "Procurement Support for Your Destination",
    "Other Coatings Grades to Review",
    "Request an M-350 Sample",
    "Request a Quote for M-350",
  ]);
  expect(screen.queryByText("Technical Specifications")).toBeNull();
  expect(screen.queryByText("Malaysia-Origin Support")).toBeNull();
  expect(screen.queryByText("Not Recommended")).toBeNull();
});

it("omits hidden section anchors from the in-page navigation", () => {
  render(<ProductPage product={m350Product} />);
  expect(screen.queryByRole("link", { name: "Specifications" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Origin support" })).toBeNull();
});
```

- [ ] **Step 2: Run the tests and verify missing modules fail**

```powershell
npm test -- --run tests/product-page.test.tsx
```

Expected: FAIL because the page orchestrator and modules are absent.

- [ ] **Step 3: Implement the section components with narrow props**

Each component receives only its own typed content. Use semantic `<section aria-labelledby>` markup and one stable ID matching `SectionId`. Application, market, and related-grade route states must render as non-production visual links with `aria-disabled="true"` and click prevention so they cannot leave the prototype.

`RecommendationPanel` renders the negative-use side only when `notRecommended.length > 0`. `TechnicalSpecifications` renders a semantic table on desktop and labeled property/value rows on mobile, but the baseline page never calls it because the module status is pending. `OriginSupport` follows the same future-ready pattern.

- [ ] **Step 4: Implement one navigation map shared by the page and anchors**

```ts
const sectionLabels: Record<SectionId, string> = {
  positioning: "Positioning",
  applications: "Applications",
  recommendations: "Recommended use",
  "technical-specifications": "Specifications",
  documents: "Documents",
  "origin-support": "Origin support",
  markets: "Markets",
  "related-grades": "Related grades",
  sample: "Sample",
  rfq: "RFQ",
};
```

Generate links only from `getVisibleSectionIds(product)`. CSS makes the navigation sticky on desktop and horizontally scrollable within its own container on mobile without creating page-level horizontal overflow.

- [ ] **Step 5: Assemble modules in the fixed approved order**

`ProductPage` must call components in this exact sequence after the hero: quick facts, in-page navigation, positioning, applications, recommendations, technical specifications, documents, origin support, markets, related grades, sample, RFQ. Wrap every evidence-controlled call in `isModuleVisible(...)`; do not mount hidden components.

- [ ] **Step 6: Add responsive content styling**

- Applications: two columns desktop, one column mobile.
- Recommended: restrained split layout; omit the empty negative side.
- Documents: checkbox-style request choices that lead to the RFQ, not download badges.
- Markets: four destination route-state items with no stock, registration, or local-availability claims.
- Related grades: three columns desktop, one column mobile.
- Section spacing: 80–104px desktop and 52–64px mobile.
- Use Soft Background for alternating section separation; do not wrap every section in a card.

- [ ] **Step 7: Run focused tests and build**

```powershell
npm test -- --run tests/product-page.test.tsx tests/visibility.test.ts
npx tsc --noEmit
npm run build
```

Expected: visible headings pass, hidden headings/anchors are absent, and build succeeds.

- [ ] **Step 8: Commit the module system**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/components/product site-prototypes/tio2-malaysia-product-page/app/products/m-350/page.tsx site-prototypes/tio2-malaysia-product-page/tests/product-page.test.tsx
git commit -m "feat: add reusable evidence-gated product modules"
```

---

### Task 5: Add enquiry prefill, optional domain validation and simulated RFQ submission

**Files:**
- Create: `site-prototypes/tio2-malaysia-product-page/lib/conversion/rfq-validation.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/components/conversion/enquiry-cta.tsx`
- Create: `site-prototypes/tio2-malaysia-product-page/components/conversion/rfq-form.tsx`
- Modify: `site-prototypes/tio2-malaysia-product-page/components/product/product-hero.tsx`
- Modify: `site-prototypes/tio2-malaysia-product-page/components/product/document-request.tsx`
- Modify: `site-prototypes/tio2-malaysia-product-page/components/product/sample-request.tsx`
- Modify: `site-prototypes/tio2-malaysia-product-page/components/product/product-page.tsx`
- Test: `site-prototypes/tio2-malaysia-product-page/tests/rfq-validation.test.ts`

**Interfaces:**
- Consumes: grade `M-350`, source page label, and enquiry type from CTA components.
- Produces: `EnquiryType`, `RfqValues`, `RfqErrors`, `validateOptionalDomain()`, `validateRfq()`, `EnquiryCta`, and `RfqForm`.

Use these exact conversion types across validation and components:

```ts
import type { ReactNode } from "react";

export type EnquiryType =
  | "Quote Request"
  | "Sample Request"
  | "Document Request";

export type RfqValues = {
  name: string;
  company: string;
  email: string;
  country: string;
  enquiryType: EnquiryType;
  application: string;
  message: string;
  websiteDomain: string;
  estimatedVolume: string;
};

export type RfqErrors = Partial<Record<keyof RfqValues, string>>;

export function validateOptionalDomain(value: string): string | null;
export function validateRfq(values: RfqValues): RfqErrors;

export type EnquiryCtaProps = {
  enquiryType: EnquiryType;
  children: ReactNode;
  className?: string;
};

export type RfqFormProps = {
  grade: "M-350";
  source: "M-350 product page";
  heading: string;
  body: string;
};
```

- [ ] **Step 1: Write failing validation tests**

```ts
import { describe, expect, it } from "vitest";
import { validateOptionalDomain, validateRfq } from "@/lib/conversion/rfq-validation";

describe("optional website domain", () => {
  it.each(["", "example.com", "https://www.example.com/path"])(
    "accepts %s",
    (value) => expect(validateOptionalDomain(value)).toBeNull(),
  );

  it.each(["not a domain", "http://", "example"])(
    "rejects %s",
    (value) => expect(validateOptionalDomain(value)).toBe("Enter a valid website domain or URL."),
  );
});

it("requires the agreed RFQ fields but not website or estimated volume", () => {
  const errors = validateRfq({
    name: "",
    company: "",
    email: "",
    country: "",
    enquiryType: "Quote Request",
    application: "",
    message: "",
    websiteDomain: "",
    estimatedVolume: "",
  });
  expect(Object.keys(errors).sort()).toEqual([
    "application",
    "company",
    "country",
    "email",
    "message",
    "name",
  ]);
});
```

- [ ] **Step 2: Run the tests and verify missing validation fails**

```powershell
npm test -- --run tests/rfq-validation.test.ts
```

Expected: FAIL because the validation module does not exist.

- [ ] **Step 3: Implement pure validation with a loose domain rule**

Normalize a non-empty domain by prepending `https://` when no scheme is present. Accept only parsed URLs whose hostname contains at least one dot and has no spaces. Return `null` for an empty value. Validate email with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` and return one concise English message per invalid field.

- [ ] **Step 4: Implement enquiry-type prefill without a network request**

Use this shared browser event:

```ts
export const RFQ_PREFILL_EVENT = "tio2:rfq-prefill";

export type EnquiryType =
  | "Quote Request"
  | "Sample Request"
  | "Document Request";
```

`EnquiryCta` is a labeled link to `#rfq`. On click it dispatches a `CustomEvent` with the selected type, then calls `document.getElementById("rfq")?.scrollIntoView({ behavior: "smooth" })`. Do not prevent the link's fragment fallback.

- [ ] **Step 5: Build the RFQ form with exact agreed fields**

Required inputs: Name, Company, Business Email, Country / Region, Enquiry Type, Application, Message / Requirement.

Optional inputs: Website Domain, Estimated Volume.

Hidden/read-only context: Grade `M-350`, Source `M-350 product page`.

The form listens for `RFQ_PREFILL_EVENT`, updates the enquiry type, validates on submit, focuses the first invalid field, and displays errors with `role="alert"`. A valid submit performs no fetch and replaces the form action area with `Your prototype enquiry has been recorded locally for review.` inside `aria-live="polite"`.

- [ ] **Step 6: Replace conversion links with `EnquiryCta`**

- Hero quote: `Quote Request`.
- Hero and sample-section sample actions: `Sample Request`.
- Document-section action: `Document Request`.
- Preserve `href="#rfq"` for keyboard and non-JavaScript behavior.

- [ ] **Step 7: Run validation, component tests and TypeScript**

```powershell
npm test -- --run tests/rfq-validation.test.ts tests/product-page.test.tsx
npx tsc --noEmit
```

Expected: all tests pass; no form field or event type errors.

- [ ] **Step 8: Commit the conversion flow**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/lib/conversion site-prototypes/tio2-malaysia-product-page/components/conversion site-prototypes/tio2-malaysia-product-page/components/product site-prototypes/tio2-malaysia-product-page/tests/rfq-validation.test.ts
git commit -m "feat: add local M-350 RFQ conversion flow"
```

---

### Task 6: Add browser-level behavior, noindex and accessibility verification

**Files:**
- Create: `site-prototypes/tio2-malaysia-product-page/playwright.config.ts`
- Create: `site-prototypes/tio2-malaysia-product-page/tests/product-page.spec.ts`
- Modify: `site-prototypes/tio2-malaysia-product-page/app/products/m-350/page.tsx`
- Modify: `site-prototypes/tio2-malaysia-product-page/package.json`

**Interfaces:**
- Consumes: completed `/products/m-350` page and `npm run dev` on port 3010.
- Produces: repeatable Chromium acceptance checks for routing, metadata, hidden modules, CTA prefill and local success state.

- [ ] **Step 1: Write the failing Playwright acceptance test**

```ts
import { expect, test } from "@playwright/test";

test("M-350 prototype is noindex and evidence gated", async ({ page }) => {
  await page.goto("/products/m-350");
  await expect(page).toHaveTitle(/M-350 Titanium Dioxide/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/M-350/);
  await expect(page.getByText("Technical Specifications")).toHaveCount(0);
  await expect(page.getByText("Malaysia-Origin Support")).toHaveCount(0);
});

test("sample CTA prefills the RFQ and valid input stays local", async ({ page }) => {
  await page.goto("/products/m-350");
  await page.getByRole("link", { name: "Request an M-350 Sample" }).first().click();
  await expect(page.getByLabel("Enquiry Type")).toHaveValue("Sample Request");

  await page.getByLabel("Name").fill("Prototype Reviewer");
  await page.getByLabel("Company").fill("Review Company");
  await page.getByLabel("Business Email").fill("reviewer@example.com");
  await page.getByLabel("Country / Region").fill("Malaysia");
  await page.getByLabel("Application").fill("Decorative coatings");
  await page.getByLabel("Message / Requirement").fill("Local prototype validation only.");
  await page.getByRole("button", { name: "Send M-350 Enquiry" }).click();

  await expect(page.getByText("recorded locally for review")).toBeVisible();
});
```

- [ ] **Step 2: Configure Playwright and verify the test initially fails**

Set `baseURL` to `http://127.0.0.1:3010`, use Chromium only for the local review suite, and configure:

```ts
webServer: {
  command: "npm run dev",
  url: "http://127.0.0.1:3010/products/m-350",
  reuseExistingServer: true,
}
```

Run:

```powershell
npm run test:e2e -- tests/product-page.spec.ts
```

Expected: FAIL on any incomplete metadata, label, CTA, or success behavior.

- [ ] **Step 3: Fix route metadata and accessible names to satisfy the browser contract**

Use route metadata title `M-350 Titanium Dioxide Product Page Prototype` and description from the approved M-350 direction. Keep `robots: { index: false, follow: false }`; do not add `alternates.canonical`, sitemap, Product JSON-LD, or production origin.

Ensure every input has an explicit `<label htmlFor>`, all section headings have stable IDs, and every decorative illustration is `aria-hidden="true"` while the visual column has one concise accessible label.

- [ ] **Step 4: Run the full browser acceptance test**

```powershell
npm run test:e2e -- tests/product-page.spec.ts
```

Expected: both Chromium tests pass.

- [ ] **Step 5: Run unit tests and production build**

```powershell
npm test
npm run build
```

Expected: all unit tests pass; production build succeeds.

- [ ] **Step 6: Commit browser verification**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/playwright.config.ts site-prototypes/tio2-malaysia-product-page/tests/product-page.spec.ts site-prototypes/tio2-malaysia-product-page/app/products/m-350/page.tsx site-prototypes/tio2-malaysia-product-page/package.json
git commit -m "test: verify M-350 product page behavior"
```

---

### Task 7: Finish responsive styling and generate review artifacts

**Files:**
- Modify: `site-prototypes/tio2-malaysia-product-page/components/product/product-page.module.css`
- Modify: `site-prototypes/tio2-malaysia-product-page/app/globals.css`
- Create: `site-prototypes/tio2-malaysia-product-page/tests/responsive.spec.ts`
- Generate: `site-prototypes/tio2-malaysia-product-page/artifacts/m-350-desktop.png`
- Generate: `site-prototypes/tio2-malaysia-product-page/artifacts/m-350-tablet.png`
- Generate: `site-prototypes/tio2-malaysia-product-page/artifacts/m-350-mobile.png`
- Generate: `site-prototypes/tio2-malaysia-product-page/artifacts/m-350-desktop-full-page.png`
- Generate: `site-prototypes/tio2-malaysia-product-page/artifacts/m-350-mobile-full-page.png`

**Interfaces:**
- Consumes: final product page selectors and local Playwright web server.
- Produces: overflow assertions and the requested desktop/tablet/mobile visual deliverables.

- [ ] **Step 1: Write the failing responsive test**

```ts
import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} has no page-level horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/products/m-350");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });
}
```

- [ ] **Step 2: Run the responsive test and capture current failures**

```powershell
npm run test:e2e -- tests/responsive.spec.ts
```

Expected: FAIL if navigation, hero illustration, grids, specification renderer, or RFQ exceeds the viewport.

- [ ] **Step 3: Apply the exact responsive rules**

- 1440px: content max-width 1200px; two-column hero; four application items in two columns; three related grades; two-column RFQ.
- 768px: hero becomes one column when copy or actions would compress; application and related-grade grids use two columns where labels fit.
- 390px: one-column hero with copy before visual; full-width CTA actions; all content grids and RFQ become one column.
- Editable inputs use at least 16px text on mobile.
- Touch targets use at least 44px block size.
- Sticky page navigation scrolls internally and does not widen the document.
- Tables switch to property/value rows below 640px.
- No fixed viewport-height containers and no content hidden behind sticky elements.

- [ ] **Step 4: Re-run the responsive tests**

```powershell
npm run test:e2e -- tests/responsive.spec.ts
```

Expected: all three overflow tests pass.

- [ ] **Step 5: Generate the five required screenshots with Playwright**

Add screenshot assertions to `responsive.spec.ts` with `animations: "disabled"` and exact output paths under `artifacts/`. Capture normal viewport screenshots for desktop/tablet/mobile and `fullPage: true` screenshots for desktop/mobile. Do not mask product content; the form contains only fixed review data or blank inputs.

- [ ] **Step 6: Inspect every screenshot visually**

Verify:

- Approved white/navy/teal proportions.
- One clear H1 and visible CTA hierarchy.
- No clipped labels, overlapping cards, compressed buttons or unreadable text.
- Hidden technical, origin, and negative-use sections do not leave blank bands.
- Product illustration is visibly identified as a review asset.
- Mobile content order is copy, actions, product visual, then page modules.

If any item fails, adjust CSS and regenerate all five screenshots so artifacts represent the same final build.

- [ ] **Step 7: Run the complete verification suite**

```powershell
npm test
npm run test:e2e
npm run build
```

Expected: unit, browser, responsive tests and production build all pass.

- [ ] **Step 8: Commit responsive styling and review artifacts**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/app/globals.css site-prototypes/tio2-malaysia-product-page/components/product/product-page.module.css site-prototypes/tio2-malaysia-product-page/tests/responsive.spec.ts site-prototypes/tio2-malaysia-product-page/artifacts
git commit -m "feat: complete responsive M-350 visual prototype"
```

---

### Task 8: Document local operation, WordPress migration and isolation evidence

**Files:**
- Create: `site-prototypes/tio2-malaysia-product-page/README.md`
- Create: `site-prototypes/tio2-malaysia-product-page/docs/wordpress-adapter.md`
- Modify: `site-prototypes/tio2-malaysia-product-page/package.json`

**Interfaces:**
- Consumes: final commands, product types, statuses and artifacts.
- Produces: a direct developer handoff for running the prototype and later replacing local data with a WordPress adapter.

- [ ] **Step 1: Write the local operation guide**

`README.md` must include:

```powershell
cd D:\16Wordpress_nextjs\site-prototypes\tio2-malaysia-product-page
npm install
npm run dev
```

State the local route `http://127.0.0.1:3010/products/m-350`, test commands, build command, artifact locations, and explicit warnings that the prototype is noindex, sends no enquiries, and is not connected to either existing site or WordPress.

- [ ] **Step 2: Write the future WordPress adapter map**

Document this exact boundary:

```ts
export interface ProductPageDataSource {
  getBySlug(slug: string): Promise<ProductPageData | null>;
}
```

Map WordPress groups to `ProductPageData` modules, retain module-level publication statuses, and require the adapter to omit unverified content before components receive it. Explain that WordPress owns editable content while Next.js owns layout, filtering, SEO, structured-data filtering, CTA behavior and responsive presentation.

Record the non-blocking grade rules: M-2377 content conflicts leave affected modules pending and hidden; M-996/M-2196 cards do not state a performance difference until verified differentiation is supplied. These rules reuse the same generic status and related-grade components and do not require template forks.

State that future production integration must separately add the approved origin, canonical, route map, public Product/Breadcrumb JSON-LD, Sitemap and domain settings. Do not add those features to the prototype.

- [ ] **Step 3: Add a single verification command**

Add to `package.json`:

```json
"verify": "npm test && npm run test:e2e && npm run build"
```

- [ ] **Step 4: Run final verification**

```powershell
npm run verify
```

Expected: all tests and build pass from the isolated prototype directory.

- [ ] **Step 5: Prove existing-site isolation with Git status**

From `D:\16Wordpress_nextjs` run:

```powershell
git status --short
git diff --name-only -- app components lib sites wordpress
```

Expected: the second command prints no paths caused by this implementation. Preserve pre-existing user changes such as root `tsconfig.json` and `site-prototypes/tiovar-global-site/`; do not stage, modify or remove them.

- [ ] **Step 6: Commit documentation only**

```powershell
git add -- site-prototypes/tio2-malaysia-product-page/README.md site-prototypes/tio2-malaysia-product-page/docs/wordpress-adapter.md site-prototypes/tio2-malaysia-product-page/package.json
git commit -m "docs: add TiO2 product prototype handoff"
```

- [ ] **Step 7: Present the review handoff**

Report the local route, primary files, screenshot paths, tests/build results, and the fact that Site A, Site B and WordPress were not modified. Do not claim deployment, publication, production SEO readiness, evidence verification, or WordPress integration.
