export interface ParsedLegalSection {
  readonly id: string
  readonly heading: string
  readonly markdown: string
}

export interface ParsedLegalDocument {
  readonly raw: string
  readonly h1: string
  readonly updated: string
  readonly introMarkdown: string
  readonly heroActions: readonly string[]
  readonly sections: readonly ParsedLegalSection[]
}

export function legalSectionId(heading: string): string {
  return heading
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function actions(line: string | undefined): readonly string[] {
  if (!line?.startsWith('Actions:') && !line?.startsWith('Tindakan:')) return []
  return line
    .replace(/^(Actions|Tindakan):\s*/, '')
    .split('·')
    .map((value) => value.replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

export function parseLegalMarkdown(markdown: string): ParsedLegalDocument {
  const raw = markdown.replace(/\r\n/g, '\n').trim()
  const sectionMatches = [...raw.matchAll(/^## (.+)$/gm)]
  if (!raw.startsWith('# ') || sectionMatches.length === 0) throw new Error('Invalid approved Legal buyer copy')
  const firstSection = sectionMatches[0]!
  const hero = raw.slice(0, firstSection.index).trim()
  const heroLines = hero.split('\n')
  const h1 = heroLines[0]!.slice(2).trim()
  const updatedLine = heroLines.find((line) => /^\*\*(Last updated|Kemas kini terakhir):/.test(line))
  if (!updatedLine) throw new Error('Approved Legal copy has no visible update date')
  const actionLine = heroLines.find((line) => /^(Actions|Tindakan):/.test(line))
  const introMarkdown = heroLines
    .slice(1)
    .filter((line) => line !== updatedLine && line !== actionLine)
    .join('\n')
    .trim()
  const sections = sectionMatches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = sectionMatches[index + 1]?.index ?? raw.length
    const body = raw.slice(start, end).trim()
    const bodyLines = body.split('\n')
    const trailingActionIndex = bodyLines.findIndex((line) => /^(Actions|Tindakan):/.test(line))
    return {
      id: legalSectionId(match[1]!),
      heading: match[1]!,
      markdown: (trailingActionIndex >= 0 ? bodyLines.slice(0, trailingActionIndex) : bodyLines).join('\n').trim(),
    }
  })
  return {
    raw, h1,
    updated: updatedLine.replace(/\*\*/g, ''),
    introMarkdown,
    heroActions: actions(actionLine),
    sections,
  }
}
