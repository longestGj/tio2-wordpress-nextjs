import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const d23Root = path.resolve(process.env.D23_ROOT ?? "D:/23MySec");

const pages = [
  {
    pageId: "APP-COAT",
    slug: "app-coat",
    sourceRoot: "coatings",
    route: "/applications/titanium-dioxide-for-coatings/",
    provisional: false,
    packageId: "APP-COAT-G6-HANDOFF-01",
    packageFile: "06_handoff/APP-COAT_GATE6_HANDOFF_PACKAGE_V0.1.md",
    packageSha256: "0ed6c22408f96e4282917b935dd551d0d0ed4b74becbd78a6eefac967460f915",
    bodyFile: "04_planning/APP-COAT_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md",
    bodySha256: "e5c9ffa7bcd7ae0375e45e27ba9bc26b95d00d317ff19c243e7e931b17706531",
    visualFile: "04_planning/gate4-v0.1/APP-COAT_GATE4_COMPLETE_VISUAL_V0.1.html",
    visualSha256: "a1e8c4153831aa829698f62e0c30c1fc7a77ec5bbb1f23ce264dede5d61443d2",
    title: "Titanium Dioxide for Coatings | Grade Evaluation",
    metaDescription:
      "Compare TiO2 grades in your coating system by formulation, dispersion, film, exposure and test basis. Review Grades, documents, samples and RFQ inputs.",
    heading: "Titanium Dioxide for Coatings",
    breadcrumbLabel: "Coatings",
    pageStyleBlocks: "from-root",
  },
  {
    pageId: "APP-PLAS",
    slug: "app-plas",
    sourceRoot: "plastics",
    route: "/applications/titanium-dioxide-for-plastics/",
    provisional: true,
    packageId: "APP-PLAS-G6-HANDOFF-01",
    packageFile: "06_handoff/APP-PLAS_GATE6_HANDOFF_PACKAGE_V0.1.md",
    packageSha256: "30b1a564dd7cb4dc04e9f7feeb2a3d904403d4313bfa20319aee84ac514f9c0d",
    bodyFile: "04_planning/APP-PLAS_GATE2_FULL_BUYER_CLEAN_COPY_V0.3.md",
    bodySha256: "8db6d6fa979831e1e5c5930bdfe3ec261bb74d252304658251a37932bbea4f92",
    visualFile: "04_planning/gate4-v0.1/APP-PLAS_GATE4_COMPLETE_VISUAL_V0.1.html",
    visualSha256: "fd61a0b74f81c094af4193dcd323cb6f4965321ff453039e0b7bd58c6891e6f9",
    title: "Titanium Dioxide for Plastics | Grade Evaluation",
    metaDescription:
      "Compare TiO2 candidates in a defined plastic resin, process, specimen and exposure. Review Product Grades and prepare a document, sample or quotation request.",
    heading: "Titanium Dioxide for Plastics",
    breadcrumbLabel: "Plastics",
    pageStyleBlocks: "after-shared-block",
  },
  {
    pageId: "APP-MB",
    slug: "app-mb",
    sourceRoot: "masterbatch",
    route: "/applications/titanium-dioxide-for-masterbatch/",
    provisional: true,
    packageId: "APP-MB-G6-HANDOFF-01",
    packageFile: "06_handoff/APP-MB_GATE6_HANDOFF_PACKAGE_V0.1.md",
    packageSha256: "fc8f25356db20de25fbbbbfee086335563f5e017fdb4097726d058d045e64c7c",
    bodyFile: "04_planning/APP-MB_GATE2_FULL_BUYER_CLEAN_COPY_V0.3.md",
    bodySha256: "06bdd245d1722223c415e0c4cecc7248f64d938cc37f936ae160b240faa9343f",
    visualFile: "04_planning/gate4-v0.1/APP-MB_GATE4_EDITABLE_SOURCE_V0.1.html",
    visualSha256: "96ef54b24f4121dbd79ce4975f9e7c48ff0d6de0a270a82f93652f76525b9c1e",
    title: "Titanium Dioxide for Masterbatch Evaluation | TiO2 Malaysia",
    metaDescription:
      "Evaluate titanium dioxide for masterbatch by separating concentrate processing from final-article evidence. Review Product Grades and prepare your request.",
    heading: "Titanium Dioxide for Masterbatch",
    breadcrumbLabel: "Masterbatch",
    pageStyleBlocks: "from-root",
  },
  {
    pageId: "APP-INK",
    slug: "app-ink",
    sourceRoot: "printing-inks",
    route: "/applications/titanium-dioxide-for-printing-inks/",
    provisional: true,
    packageId: "APP-INK-G6-HANDOFF-01",
    packageFile: "06_handoff/APP-INK_GATE6_HANDOFF_PACKAGE_V0.1.md",
    packageSha256: "fe8769f96f1450638d1b5f46650be69ca73daeb8efdb1e7d5c99acb2421d014c",
    bodyFile: "04_planning/APP-INK_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md",
    bodySha256: "b5a92976f526fcfee74fdf088ec9ea3ef21456e5ba66965f79c50ec4dd5c938d",
    visualFile: "04_planning/gate4-v0.1/APP-INK_GATE4_COMPLETE_VISUAL_V0.1.html",
    visualSha256: "148baf534aae5beaf66f2b776f2741dccb5f5b2fe458761d2193fa83eb65ae98",
    title: "Titanium Dioxide for Printing Inks | TiO2 Malaysia",
    metaDescription:
      "Compare titanium dioxide candidates in a defined white-ink and print system. Review Product Grades and prepare a document, sample or quotation request.",
    heading: "Titanium Dioxide for Printing Inks",
    breadcrumbLabel: "Printing Inks",
    pageStyleBlocks: "from-root",
  },
  {
    pageId: "APP-PAPER",
    slug: "app-paper",
    sourceRoot: "paper",
    route: "/applications/titanium-dioxide-for-paper/",
    provisional: true,
    packageId: "APP-PAPER-G6-HANDOFF-01",
    packageFile: "06_handoff/APP-PAPER_GATE6_HANDOFF_PACKAGE_V0.1.md",
    packageSha256: "c50e1287cdd88a3ebac79cf0accd895be5292d43355b257a9974a9a2effcf1fa",
    bodyFile: "04_planning/APP-PAPER_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md",
    bodySha256: "14a77a04347e78b7ad080cd9d8b7f6251692450380216506e6e0745724012542",
    visualFile: "04_planning/gate4-v0.1/APP-PAPER_GATE4_COMPLETE_VISUAL_V0.1.html",
    visualSha256: "e3d7907131d98b987328bf084ba80ed90476363e3caa9936252c5558784bac9f",
    title: "Titanium Dioxide for Paper Evaluation | TiO2 Malaysia",
    metaDescription:
      "Evaluate titanium dioxide for paper in a defined system. Compare method-matched results, review Product Grades, and prepare document, sample or RFQ details.",
    heading: "Titanium Dioxide for Paper",
    breadcrumbLabel: "Paper",
    pageStyleBlocks: "from-root",
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertHash(label, value, expected) {
  const actual = sha256(value);
  if (actual !== expected) {
    throw new Error(`${label} SHA-256 mismatch: expected ${expected}, received ${actual}`);
  }
}

function styleBlocks(html) {
  return [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].map((match) => match[1]);
}

function findMatchingBrace(css, start) {
  let depth = 0;
  let quote = null;
  for (let index = start; index < css.length; index += 1) {
    const character = css[index];
    if (quote) {
      if (character === quote && css[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("Unbalanced CSS block");
}

function splitSelectors(selectorText) {
  const selectors = [];
  let current = "";
  let depth = 0;
  for (const character of selectorText) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      selectors.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

function scopeSelector(selector, prefix) {
  if (selector === ":root" || selector === "html" || selector === "body" || selector === "main") {
    return prefix;
  }
  if (selector.startsWith("html ")) return `${prefix} ${selector.slice(5)}`;
  if (selector.startsWith("body ")) return `${prefix} ${selector.slice(5)}`;
  if (selector.startsWith("main ")) return `${prefix} ${selector.slice(5)}`;
  return `${prefix} ${selector}`;
}

function scopeCss(css, prefix) {
  let output = "";
  let cursor = 0;
  while (cursor < css.length) {
    const open = css.indexOf("{", cursor);
    if (open < 0) break;
    const prelude = css.slice(cursor, open).trim();
    const close = findMatchingBrace(css, open);
    const body = css.slice(open + 1, close);
    cursor = close + 1;
    if (!prelude) continue;

    if (/^@(media|supports|container|layer)\b/i.test(prelude)) {
      output += `${prelude} {\n${scopeCss(body, prefix)}}\n`;
      continue;
    }
    if (/^@(font-face|keyframes|-webkit-keyframes)\b/i.test(prelude)) continue;

    const selectors = splitSelectors(prelude)
      .filter((selector) => !/\.(header|footer|cookie-layer)\b/.test(selector))
      .map((selector) => scopeSelector(selector, prefix));
    if (!selectors.length) continue;
    output += `${selectors.join(",\n")} {\n  ${body.trim()}\n}\n`;
  }
  return output;
}

function pageCss(page, visualHtml) {
  const blocks = styleBlocks(visualHtml);
  let sourceCss;
  if (page.pageStyleBlocks === "after-shared-block") {
    sourceCss = blocks.slice(1).join("\n");
  } else {
    const block = blocks.at(-1) ?? "";
    const start = block.indexOf(":root{");
    if (start < 0) throw new Error(`${page.pageId} page CSS root marker is missing`);
    sourceCss = block.slice(start);
  }
  const prefix = `[data-editorial-page="${page.pageId}"] main`;
  const sharedFontCss = sourceCss
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\bInter\s*,\s*Arial\s*,\s*sans-serif\b/gi, "var(--font-my-shared),Arial,sans-serif");
  const scoped = scopeCss(sharedFontCss, prefix);
  if (/\.(header|footer|cookie-layer)\b/.test(scoped)) {
    throw new Error(`${page.pageId} extracted CSS targets shared Chrome`);
  }
  return `/* Generated from the approved Gate 4 main-page styles. Shared Chrome styles are intentionally excluded. */\n${scoped}`;
}

const configDirectory = path.join(projectRoot, "wordpress/plugins/tio2-site-model/config");
const cssDirectory = path.join(projectRoot, "components/sites/tio2-my/editorial");
await Promise.all([mkdir(configDirectory, { recursive: true }), mkdir(cssDirectory, { recursive: true })]);

for (const page of pages) {
  const sourceDirectory = path.join(d23Root, "pages/applications", page.sourceRoot);
  const [packageText, bodyText, visualHtml] = await Promise.all([
    readFile(path.join(sourceDirectory, page.packageFile), "utf8"),
    readFile(path.join(sourceDirectory, page.bodyFile), "utf8"),
    readFile(path.join(sourceDirectory, page.visualFile), "utf8"),
  ]);
  assertHash(`${page.pageId} package`, packageText, page.packageSha256);
  assertHash(`${page.pageId} body`, bodyText, page.bodySha256);
  assertHash(`${page.pageId} visual`, visualHtml, page.visualSha256);

  const document = new JSDOM(visualHtml).window.document;
  const main = document.querySelector("main");
  if (!main) throw new Error(`${page.pageId} visual source has no main element`);
  if (main.querySelector("header,footer,script,style")) {
    throw new Error(`${page.pageId} visual main contains shared Chrome or executable/style content`);
  }

  const config = {
    identity: {
      pageId: page.pageId,
      siteScope: "tio2-my",
      locale: "en",
      path: page.route,
      section: "applications",
      provisional: page.provisional,
      schemaVersion: "editorial-v0.1",
    },
    source: {
      packageId: page.packageId,
      packageSha256: page.packageSha256,
      bodySha256: page.bodySha256,
      visualSha256: page.visualSha256,
    },
    seo: {
      title: page.title,
      metaDescription: page.metaDescription,
      canonical: `https://tio2malaysia.com${page.route}`,
    },
    heading: page.heading,
    breadcrumb: [
      { label: "Home", href: "/" },
      { label: "Applications", href: "/applications/" },
      { label: page.breadcrumbLabel, href: page.route },
    ],
    bodyHtml: main.innerHTML,
    mainClass: main.getAttribute("class") || "editorial-application-main",
    freshness: null,
  };

  await Promise.all([
    writeFile(
      path.join(configDirectory, `tio2-my-editorial-${page.slug}.json`),
      `${JSON.stringify(config, null, 2)}\n`,
      "utf8",
    ),
    writeFile(path.join(cssDirectory, `${page.slug}.css`), pageCss(page, visualHtml), "utf8"),
  ]);
  process.stdout.write(`${page.pageId}: payload and scoped CSS generated\n`);
}
