import legalReadContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-read-contract.json'

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

const forbiddenControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u

function validateMarkdown(markdown: string): string {
  if (
    typeof markdown !== 'string'
    || markdown.length === 0
    || markdown.trim() !== markdown
    || [...markdown].length > legalReadContract.maximumTextCodePoints
    || forbiddenControls.test(markdown)
    || /[<>]/u.test(markdown)
    || /!\[/u.test(markdown)
  ) throw new Error('Invalid Legal buyer copy')

  const raw = markdown.replace(/\r\n?/gu, '\n')
  const lines = raw.split('\n')
  const h1Lines = lines.filter((line) => /^#(?!#)(?: |$)/u.test(line))
  if (h1Lines.length !== 1 || lines[0] !== h1Lines[0] || !/^# \S(?:.*\S)?$/u.test(h1Lines[0]!)) {
    throw new Error('Legal buyer copy must have exactly one nonempty H1')
  }

  const h2Lines = lines.filter((line) => /^##(?!#)(?: |$)/u.test(line))
  if (h2Lines.length === 0 || h2Lines.some((line) => !/^## \S(?:.*\S)?$/u.test(line))) {
    throw new Error('Legal buyer copy must have a nonempty H2')
  }

  const sectionIds = h2Lines.map((line) => legalSectionId(line.slice(3)))
  if (sectionIds.some((id) => !id) || new Set(sectionIds).size !== sectionIds.length) {
    throw new Error('Legal buyer copy has invalid section IDs')
  }

  const allowedLinks = new Set<string>(legalReadContract.markdown.allowedLinkDestinations)
  for (const match of raw.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/gu)) {
    if (!allowedLinks.has(match[1]!)) throw new Error('Legal buyer copy has an unsupported link')
  }

  const allowedActions = new Set(legalReadContract.markdown.actionBindings.map(({label}) => label))
  for (const line of lines.filter((candidate) => /^(Actions|Tindakan):/u.test(candidate))) {
    const labels = actions(line)
    if (labels.length === 0 || labels.some((label) => !allowedActions.has(label))) {
      throw new Error('Legal buyer copy has an unsupported action')
    }
  }

  return raw
}

export function parseLegalMarkdown(markdown: string): ParsedLegalDocument {
  const raw = validateMarkdown(markdown)
  const sectionMatches = [...raw.matchAll(/^## (.+)$/gm)]
  const firstSection = sectionMatches[0]!
  const hero = raw.slice(0, firstSection.index).trim()
  const heroLines = hero.split('\n')
  const h1 = heroLines[0]!.slice(2).trim()
  const updatedLines = heroLines.filter((line) => /^\*\*(Last updated|Kemas kini terakhir):\s*\S.*\*\*$/u.test(line))
  if (updatedLines.length !== 1) throw new Error('Legal buyer copy has no unique visible update date')
  const updatedLine = updatedLines[0]!
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
