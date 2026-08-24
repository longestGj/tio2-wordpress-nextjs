import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, test} from 'vitest'
import {parse as parseYaml} from 'yaml'

const repoRoot = resolve(import.meta.dirname, '../..')
const agentPath = resolve(repoRoot, '.codex/agents/tio2-home-template.toml')
const skillPath = resolve(repoRoot, '.agents/skills/tio2-home-template/SKILL.md')
const homepageContractPath = resolve(
  repoRoot,
  '.agents/skills/tio2-home-template/references/homepage-template-contract.md',
)
const qualityGatesPath = resolve(
  repoRoot,
  '.agents/skills/tio2-home-template/references/quality-gates.md',
)
const wordpressFieldContractPath = resolve(
  repoRoot,
  '.agents/skills/tio2-home-template/references/wordpress-field-contract.md',
)

function parseStringOnlyToml(source: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = source.replaceAll('\r\n', '\n').split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (line === '' || line.startsWith('#')) continue

    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!assignment) throw new Error(`Invalid TOML assignment on line ${index + 1}`)

    const [, key, value] = assignment
    if (value === '"""') {
      const body: string[] = []
      index += 1
      while (index < lines.length && lines[index].trim() !== '"""') {
        body.push(lines[index])
        index += 1
      }
      if (index === lines.length) throw new Error(`Unterminated TOML string for ${key}`)
      result[key] = body.join('\n')
      continue
    }

    try {
      result[key] = JSON.parse(value) as string
    } catch {
      throw new Error(`Invalid TOML string for ${key} on line ${index + 1}`)
    }
  }

  return result
}

function parseSkill(source: string) {
  const normalized = source.replaceAll('\r\n', '\n')
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(normalized)
  if (!frontmatter) throw new Error('SKILL.md must begin with YAML frontmatter')

  return {
    metadata: parseYaml(frontmatter[1]) as {
      name: string
      description: string
      metadata: Record<string, string>
    },
    body: normalized.slice(frontmatter[0].length),
  }
}

describe('project Homepage Agent/Skill contract', () => {
  test('publishes parseable project metadata for the homepage specialist', () => {
    const agent = parseStringOnlyToml(readFileSync(agentPath, 'utf8'))
    const skill = parseSkill(readFileSync(skillPath, 'utf8'))

    expect(agent).toMatchObject({
      name: 'tio2_home_template',
      description:
        'Project specialist for designing, implementing, and auditing the TiO2 homepage template across WordPress and Next.js.',
      model_reasoning_effort: 'high',
    })
    expect(agent.developer_instructions).toBeTypeOf('string')
    expect(skill.metadata).toMatchObject({
      name: 'tio2-home-template',
      metadata: {
        project_agent: 'tio2_home_template',
        modes: 'Design, Implement, Audit',
        implement_approval_record:
          'proposal ID, exact proposal artifact/path, verbatim user approval quote, accepted scope/decisions',
        audit_read_only: 'true',
        ownership: 'homepage-template',
        external_actions: 'none',
      },
    })
  })

  test('keeps every skill reference repository-local and resolvable', () => {
    const {body} = parseSkill(readFileSync(skillPath, 'utf8'))
    const referenceLinks = [...body.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map(
      (match) => match[1],
    )

    expect(new Set(referenceLinks)).toEqual(
      new Set([
        'references/homepage-template-contract.md',
        'references/wordpress-field-contract.md',
        'references/quality-gates.md',
      ]),
    )
    for (const reference of referenceLinks) {
      expect(readFileSync(resolve(skillPath, '..', reference), 'utf8').length).toBeGreaterThan(0)
    }
  })

  test('preserves Homepage specialist routing when Site Template work is introduced', () => {
    const agents = readFileSync(resolve(repoRoot, 'AGENTS.md'), 'utf8')

    expect(agents).toContain(
      'Site Template routing preserves the existing Homepage specialist contract: homepage work remains delegated to `tio2_home_template` and parent orchestration cannot substitute for Homepage implementation.',
    )
  })

  test('binds Homepage work to the approved inventory and decoupled runtime contract', () => {
    const homepageContract = readFileSync(homepageContractPath, 'utf8')
    const qualityGates = readFileSync(qualityGatesPath, 'utf8')

    expect(homepageContract).toContain(
      'Site A uses its active Homepage runtime and Site B uses its distinct `homepage-v0.1` frozen runtime.',
    )
    expect(homepageContract).toContain(
      "Site B's field schema, template structure, and visible behavior are frozen while its existing content values remain editable",
    )
    expect(homepageContract).toContain(
      'Product/application cards remain non-interactive, the Hero secondary CTA is absent, and unavailable FAQ related links are absent.',
    )
    expect(qualityGates).toContain(
      'Read each site\'s expected public URL count from the versioned public route inventory; the approved initial count is one (`/`) per site.',
    )
    expect(qualityGates).toContain(
      'Verify Site A and Site B select distinct Homepage runtime entries',
    )
    expect(qualityGates).not.toContain('Preserve exactly 505 unique public URLs per site')
  })

  test('documents the stable site-scoped RFQ controlled-variant contract', () => {
    const fieldContract = readFileSync(wordpressFieldContractPath, 'utf8')

    expect(fieldContract).toContain('`site-a-rfq-copy-v0.1`')
    expect(fieldContract).toContain('`site-b-rfq-copy-v0.1-frozen`')
    for (const field of [
      '`rfq_intro`',
      '`rfq_privacy_text`',
      '`rfq_success_heading`',
      '`rfq_success_message`',
    ]) {
      expect(fieldContract).toContain(`${field} | select, required`)
    }
    expect(fieldContract).toContain(
      'Normalization is limited to trimming and collapsing consecutive whitespace.',
    )
  })
})
