import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const d23Root = "D:/23MySec/pages/applications";

type PageSpec = {
  pageId: string;
  slug: string;
  route: string;
  provisional: boolean;
  packageId: string;
  packageSha256: string;
  bodySha256: string;
  visualSha256: string;
  title: string;
  metaDescription: string;
  heading: string;
  breadcrumbLabel: string;
  sourceRoot: string;
  bodyFile: string;
  visualFile: string;
  modules: number;
};

const pages: PageSpec[] = [
  {
    pageId: "APP-COAT",
    slug: "app-coat",
    route: "/applications/titanium-dioxide-for-coatings/",
    provisional: true,
    packageId: "APP-COAT-G6-HANDOFF-01",
    packageSha256: "0ed6c22408f96e4282917b935dd551d0d0ed4b74becbd78a6eefac967460f915",
    bodySha256: "e5c9ffa7bcd7ae0375e45e27ba9bc26b95d00d317ff19c243e7e931b17706531",
    visualSha256: "a1e8c4153831aa829698f62e0c30c1fc7a77ec5bbb1f23ce264dede5d61443d2",
    title: "Titanium Dioxide for Coatings | Grade Evaluation",
    metaDescription:
      "Compare TiO2 grades in your coating system by formulation, dispersion, film, exposure and test basis. Review Grades, documents, samples and RFQ inputs.",
    heading: "Titanium Dioxide for Coatings",
    breadcrumbLabel: "Coatings",
    sourceRoot: "coatings",
    bodyFile: "04_planning/APP-COAT_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md",
    visualFile: "04_planning/gate4-v0.1/APP-COAT_GATE4_COMPLETE_VISUAL_V0.1.html",
    modules: 10,
  },
  {
    pageId: "APP-PLAS",
    slug: "app-plas",
    route: "/applications/titanium-dioxide-for-plastics/",
    provisional: true,
    packageId: "APP-PLAS-G6-HANDOFF-01",
    packageSha256: "30b1a564dd7cb4dc04e9f7feeb2a3d904403d4313bfa20319aee84ac514f9c0d",
    bodySha256: "8db6d6fa979831e1e5c5930bdfe3ec261bb74d252304658251a37932bbea4f92",
    visualSha256: "fd61a0b74f81c094af4193dcd323cb6f4965321ff453039e0b7bd58c6891e6f9",
    title: "Titanium Dioxide for Plastics | Grade Evaluation",
    metaDescription:
      "Compare TiO2 candidates in a defined plastic resin, process, specimen and exposure. Review Product Grades and prepare a document, sample or quotation request.",
    heading: "Titanium Dioxide for Plastics",
    breadcrumbLabel: "Plastics",
    sourceRoot: "plastics",
    bodyFile: "04_planning/APP-PLAS_GATE2_FULL_BUYER_CLEAN_COPY_V0.3.md",
    visualFile: "04_planning/gate4-v0.1/APP-PLAS_GATE4_COMPLETE_VISUAL_V0.1.html",
    modules: 12,
  },
  {
    pageId: "APP-MB",
    slug: "app-mb",
    route: "/applications/titanium-dioxide-for-masterbatch/",
    provisional: true,
    packageId: "APP-MB-G6-HANDOFF-01",
    packageSha256: "fc8f25356db20de25fbbbbfee086335563f5e017fdb4097726d058d045e64c7c",
    bodySha256: "06bdd245d1722223c415e0c4cecc7248f64d938cc37f936ae160b240faa9343f",
    visualSha256: "96ef54b24f4121dbd79ce4975f9e7c48ff0d6de0a270a82f93652f76525b9c1e",
    title: "Titanium Dioxide for Masterbatch Evaluation | TiO2 Malaysia",
    metaDescription:
      "Evaluate titanium dioxide for masterbatch by separating concentrate processing from final-article evidence. Review Product Grades and prepare your request.",
    heading: "Titanium Dioxide for Masterbatch",
    breadcrumbLabel: "Masterbatch",
    sourceRoot: "masterbatch",
    bodyFile: "04_planning/APP-MB_GATE2_FULL_BUYER_CLEAN_COPY_V0.3.md",
    visualFile: "04_planning/gate4-v0.1/APP-MB_GATE4_EDITABLE_SOURCE_V0.1.html",
    modules: 11,
  },
  {
    pageId: "APP-INK",
    slug: "app-ink",
    route: "/applications/titanium-dioxide-for-printing-inks/",
    provisional: true,
    packageId: "APP-INK-G6-HANDOFF-01",
    packageSha256: "fe8769f96f1450638d1b5f46650be69ca73daeb8efdb1e7d5c99acb2421d014c",
    bodySha256: "b5a92976f526fcfee74fdf088ec9ea3ef21456e5ba66965f79c50ec4dd5c938d",
    visualSha256: "148baf534aae5beaf66f2b776f2741dccb5f5b2fe458761d2193fa83eb65ae98",
    title: "Titanium Dioxide for Printing Inks | TiO2 Malaysia",
    metaDescription:
      "Compare titanium dioxide candidates in a defined white-ink and print system. Review Product Grades and prepare a document, sample or quotation request.",
    heading: "Titanium Dioxide for Printing Inks",
    breadcrumbLabel: "Printing Inks",
    sourceRoot: "printing-inks",
    bodyFile: "04_planning/APP-INK_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md",
    visualFile: "04_planning/gate4-v0.1/APP-INK_GATE4_COMPLETE_VISUAL_V0.1.html",
    modules: 11,
  },
  {
    pageId: "APP-PAPER",
    slug: "app-paper",
    route: "/applications/titanium-dioxide-for-paper/",
    provisional: true,
    packageId: "APP-PAPER-G6-HANDOFF-01",
    packageSha256: "c50e1287cdd88a3ebac79cf0accd895be5292d43355b257a9974a9a2effcf1fa",
    bodySha256: "14a77a04347e78b7ad080cd9d8b7f6251692450380216506e6e0745724012542",
    visualSha256: "e3d7907131d98b987328bf084ba80ed90476363e3caa9936252c5558784bac9f",
    title: "Titanium Dioxide for Paper Evaluation | TiO2 Malaysia",
    metaDescription:
      "Evaluate titanium dioxide for paper in a defined system. Compare method-matched results, review Product Grades, and prepare document, sample or RFQ details.",
    heading: "Titanium Dioxide for Paper",
    breadcrumbLabel: "Paper",
    sourceRoot: "paper",
    bodyFile: "04_planning/APP-PAPER_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md",
    visualFile: "04_planning/gate4-v0.1/APP-PAPER_GATE4_COMPLETE_VISUAL_V0.1.html",
    modules: 11,
  },
];

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:?!])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .trim();
}

function htmlText(html: string) {
  const dom = new JSDOM(`<main>${html}</main>`);
  dom.window.document.querySelectorAll(".breadcrumb,.cell-label,.eyebrow").forEach((node) => node.remove());
  const walker = dom.window.document.createTreeWalker(
    dom.window.document.querySelector("main")!,
    dom.window.NodeFilter.SHOW_TEXT,
  );
  const parts: string[] = [];
  while (walker.nextNode()) {
    const text = normalize(walker.currentNode.textContent ?? "");
    if (text) parts.push(text);
  }
  return normalize(parts.join(" "));
}

function parseMarkdownLinks(markdown: string) {
  const links: Array<{ label: string; href: string; start: number; end: number }> = [];
  let cursor = 0;
  while (cursor < markdown.length) {
    const start = markdown.indexOf("[", cursor);
    if (start < 0) break;
    const labelEnd = markdown.indexOf("](", start + 1);
    if (labelEnd < 0) break;
    let depth = 1;
    let end = labelEnd + 2;
    for (; end < markdown.length && depth > 0; end += 1) {
      if (markdown[end] === "(") depth += 1;
      if (markdown[end] === ")") depth -= 1;
    }
    if (depth !== 0) break;
    links.push({
      label: markdown.slice(start + 1, labelEnd),
      href: markdown.slice(labelEnd + 2, end - 1),
      start,
      end,
    });
    cursor = end;
  }
  return links;
}

function replaceMarkdownLinks(markdown: string) {
  let result = markdown;
  for (const link of parseMarkdownLinks(markdown).reverse()) {
    result = `${result.slice(0, link.start)}${link.label}${result.slice(link.end)}`;
  }
  return result;
}

function buyerCopy(markdown: string) {
  const match = markdown.match(/<!-- BUYER_COPY_START -->([\s\S]*?)<!-- BUYER_COPY_END -->/);
  if (!match) throw new Error("approved buyer-copy markers are missing");
  return match[1];
}

function markdownText(markdown: string) {
  return normalize(
    buyerCopy(markdown)
      .replace(/<a\s+id="[^"]+"><\/a>/g, "")
      .split(/\r?\n/)
      .map((line) => replaceMarkdownLinks(line))
      .filter((line) => !/^\s*Home\s*\/\s*Applications\s*\//.test(line))
      .filter((line) => !/^\s*[A-Z ]+ APPLICATION\s*$/.test(line))
      .filter((line) => !/^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line))
      .map((line) =>
        line
          .replace(/^\s*#{1,6}\s+/, "")
          .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
          .replace(/^\s*\|/, "")
          .replace(/\|\s*$/, "")
          .replace(/\s*\|\s*/g, " ")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "$1")
          .replace(/_([^_\n]+)_/g, "$1")
          .replace(/`([^`\n]+)`/g, "$1"),
      )
      .join(" "),
  );
}

function markdownHeadings(markdown: string) {
  return buyerCopy(markdown)
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^#{1,3}\s+(.+)$/);
      return match ? [normalize(match[1].replace(/[*_`]/g, ""))] : [];
    });
}

function markdownLinks(markdown: string) {
  return parseMarkdownLinks(buyerCopy(markdown)).map((match) => ({
    label: normalize(match.label.replace(/[*_`]/g, "").replace(/[.]$/, "")),
    href: match.href,
  }));
}

function markdownTables(markdown: string) {
  const tables: string[][][] = [];
  let current: string[][] = [];
  for (const line of buyerCopy(markdown).split(/\r?\n/)) {
    if (/^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line)) {
      continue;
    }
    if (/^\s*\|/.test(line)) {
      current.push(
        line
          .replace(/^\s*\|/, "")
          .replace(/\|\s*$/, "")
          .split("|")
          .map((cell) =>
            normalize(
              replaceMarkdownLinks(cell)
                .replace(/\*\*([^*]+)\*\*/g, "$1")
                .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "$1")
                .replace(/_([^_\n]+)_/g, "$1")
                .replace(/`([^`\n]+)`/g, "$1"),
            ),
          ),
      );
    } else if (current.length) {
      tables.push(current);
      current = [];
    }
  }
  if (current.length) tables.push(current);
  return tables;
}

describe.each(pages)("$pageId editorial payload", (page) => {
  it("preserves the approved source identity and route state", async () => {
    const configPath = path.join(
      projectRoot,
      "wordpress/plugins/tio2-site-model/config",
      `tio2-my-editorial-${page.slug}.json`,
    );
    const config = JSON.parse(await readFile(configPath, "utf8"));

    expect(config.identity).toEqual({
      pageId: page.pageId,
      siteScope: "tio2-my",
      locale: "en",
      path: page.route,
      section: "applications",
      provisional: page.provisional,
      schemaVersion: "editorial-v0.1",
    });
    expect(config.source).toEqual({
      packageId: page.packageId,
      packageSha256: page.packageSha256,
      bodySha256: page.bodySha256,
      visualSha256: page.visualSha256,
    });
    expect(config.seo).toEqual({
      title: page.title,
      metaDescription: page.metaDescription,
      canonical: `https://tio2malaysia.com${page.route}`,
    });
    expect(config.heading).toBe(page.heading);
    expect(config.breadcrumb).toEqual([
      { label: "Home", href: "/" },
      { label: "Applications", href: "/applications/" },
      { label: page.breadcrumbLabel, href: page.route },
    ]);
    expect(config.freshness).toBeNull();
    expect(config.schemaItemList).toBeUndefined();
  });

  it("renders the complete approved B copy through the frozen visual structure", async () => {
    const sourceRoot = path.join(d23Root, page.sourceRoot);
    const [approvedMarkdown, visualHtml, configText] = await Promise.all([
      readFile(path.join(sourceRoot, page.bodyFile), "utf8"),
      readFile(path.join(sourceRoot, page.visualFile), "utf8"),
      readFile(
        path.join(
          projectRoot,
          "wordpress/plugins/tio2-site-model/config",
          `tio2-my-editorial-${page.slug}.json`,
        ),
        "utf8",
      ),
    ]);
    const config = JSON.parse(configText);
    const visual = new JSDOM(visualHtml);
    const frozenMain = visual.window.document.querySelector("main");
    const rendered = new JSDOM(`<main>${config.bodyHtml}</main>`);
    const renderedMain = rendered.window.document.querySelector("main")!;

    expect(sha256(approvedMarkdown)).toBe(page.bodySha256);
    expect(sha256(visualHtml)).toBe(page.visualSha256);
    expect(normalize(config.bodyHtml)).toBe(normalize(frozenMain?.innerHTML ?? ""));
    expect(htmlText(config.bodyHtml)).toBe(markdownText(approvedMarkdown));

    expect(
      [...renderedMain.querySelectorAll("h1,h2,h3")].map((node) => normalize(node.textContent ?? "")),
    ).toEqual(markdownHeadings(approvedMarkdown));

    const renderedLinks = [...renderedMain.querySelectorAll("a:not(.breadcrumb a)")].map((node) => ({
      label: normalize((node.textContent ?? "").replace(/[.]$/, "")),
      href: node.getAttribute("href"),
    }));
    expect(renderedLinks).toEqual(markdownLinks(approvedMarkdown));

    const renderedTables = [...renderedMain.querySelectorAll("table")].map((table) =>
      [...table.querySelectorAll("tr")].map((row) =>
        [...row.querySelectorAll("th,td")].map((cell) =>
          normalize(cell.querySelector(".cell-value")?.textContent ?? cell.textContent ?? ""),
        ),
      ),
    );
    expect(renderedTables).toEqual(markdownTables(approvedMarkdown));
    expect(renderedMain.querySelectorAll("section")).toHaveLength(page.modules);
    expect(config.bodyHtml).not.toMatch(
      /<(?:header|footer|script|style|img|form|input|button|select|textarea)\b/i,
    );
    expect(config.bodyHtml).not.toMatch(/\sstyle=/i);
    expect(config.bodyHtml).not.toContain("file:///");
  });

  it("keeps page styling inside the editorial main surface", async () => {
    const css = await readFile(
      path.join(projectRoot, "components/sites/tio2-my/editorial", `${page.slug}.css`),
      "utf8",
    );
    const prefix = `[data-editorial-page="${page.pageId}"] main`;
    const selectorLines = css
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.endsWith("{") && !line.startsWith("@"));

    expect(selectorLines.length).toBeGreaterThan(10);
    expect(selectorLines.every((line) => line.startsWith(prefix))).toBe(true);
    expect(css).not.toMatch(/(?:^|[\s,{])\.(?:header|footer|cookie-layer)\b/);
    expect(css).not.toContain("file:///");
    expect(css).toContain("var(--font-my-shared),Arial,sans-serif");
    expect(css).not.toMatch(/(?:font|font-family):[^;}]*\bInter\b/i);
  });
});
