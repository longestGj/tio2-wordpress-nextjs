import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, test} from 'vitest'
import {parse as parseYaml} from 'yaml'

const repoRoot = resolve(import.meta.dirname, '../..')
const agentPath = resolve(repoRoot, '.codex/agents/tio2-home-template.toml')
const skillPath = resolve(repoRoot, '.agents/skills/tio2-home-template/SKILL.md')

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
})
