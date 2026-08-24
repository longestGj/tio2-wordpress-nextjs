import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, test} from 'vitest'
import {parse as parseYaml} from 'yaml'

const repoRoot = resolve(import.meta.dirname, '../..')
const agentPath = resolve(repoRoot, '.codex/agents/tio2-site-template.toml')
const skillPath = resolve(repoRoot, '.agents/skills/tio2-site-template/SKILL.md')
const contractPath = resolve(
  repoRoot,
  '.agents/skills/tio2-site-template/references/site-template-contract.md',
)
const publicationPath = resolve(
  repoRoot,
  '.agents/skills/tio2-site-template/references/publication-and-migration-contract.md',
)
const qualityGatesPath = resolve(
  repoRoot,
  '.agents/skills/tio2-site-template/references/quality-gates.md',
)
const metadataPath = resolve(repoRoot, '.agents/skills/tio2-site-template/agents/openai.yaml')

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

    result[key] = JSON.parse(value) as string
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
      metadata: Record<string, string>
    },
    body: normalized.slice(frontmatter[0].length),
  }
}

describe('project Site Template Agent/Skill contract', () => {
  test('publishes project-local metadata and all required contract artifacts', () => {
    for (const filePath of [
      agentPath,
      skillPath,
      contractPath,
      publicationPath,
      qualityGatesPath,
      metadataPath,
    ]) {
      expect(existsSync(filePath), `${filePath} must exist`).toBe(true)
    }

    const agent = parseStringOnlyToml(readFileSync(agentPath, 'utf8'))
    const skill = parseSkill(readFileSync(skillPath, 'utf8'))
    const metadata = parseYaml(readFileSync(metadataPath, 'utf8')) as {
      interface: {display_name: string; default_prompt: string}
    }

    expect(agent).toMatchObject({
      name: 'tio2_site_template',
      model_reasoning_effort: 'high',
    })
    expect(skill.metadata).toMatchObject({
      name: 'tio2-site-template',
      metadata: {
        project_agent: 'tio2_site_template',
        modes: 'Design, Implement, Audit',
        implement_approval_record:
          'proposal ID, exact proposal artifact/path, verbatim user approval quote, accepted scope/decisions',
        audit_read_only: 'true',
        ownership: 'site-template-contract',
        external_actions: 'none',
      },
    })
    expect(metadata.interface.display_name).toBe('TiO2 Site Template Agent')
    expect(metadata.interface.default_prompt).toContain('$tio2-site-template')
  })

  test('enforces the approval state machine, scoped ownership, and local-only actions', () => {
    const agent = parseStringOnlyToml(readFileSync(agentPath, 'utf8'))
    const {body} = parseSkill(readFileSync(skillPath, 'utf8'))
    const references = [contractPath, publicationPath, qualityGatesPath].map((filePath) =>
      readFileSync(filePath, 'utf8'),
    )
    const combined = [agent.developer_instructions, body, ...references].join('\n')

    expect(combined).toContain('Design')
    expect(combined).toContain('Implement')
    expect(combined).toContain('Audit')
    expect(combined).toContain('proposal ID')
    expect(combined).toContain('exact proposal artifact/path')
    expect(combined).toContain('verbatim user approval quote')
    expect(combined).toContain('accepted scope/decisions')
    expect(combined).toContain('Audit is always read-only')
    expect(combined).toContain('external actions: none')
    expect(combined).toContain('template profiles')
    expect(combined).toContain('public-route inventory')
    expect(combined).toContain('shared anonymous-route guard')
    expect(combined).toContain('Sitemap/robots')
    expect(combined).toContain('retirement/restore tooling')
    expect(combined).toContain('seed/audit/complete local gate')
    expect(combined).toContain('freeze manifest')
    expect(combined).toContain('cross-template guards')
    expect(combined).toContain('Homepage-owned query/DTO/components/SEO')
    expect(combined).toContain('Product-owned CPT behavior')
    expect(combined).toContain('global deployment/DNS/indexing/production operations')
  })

  test('keeps the skill references local and routes work through the specialist only', () => {
    const agents = readFileSync(resolve(repoRoot, 'AGENTS.md'), 'utf8')
    const {body} = parseSkill(readFileSync(skillPath, 'utf8'))
    const referenceLinks = [...body.matchAll(/\]\((references\/[^)]+\.md)\)/g)].map(
      (match) => match[1],
    )

    expect(new Set(referenceLinks)).toEqual(
      new Set([
        'references/site-template-contract.md',
        'references/publication-and-migration-contract.md',
        'references/quality-gates.md',
      ]),
    )
    for (const reference of referenceLinks) {
      expect(readFileSync(resolve(skillPath, '..', reference), 'utf8').length).toBeGreaterThan(0)
    }

    expect(agents).toContain('`tio2_site_template`')
    expect(agents).toContain('`$tio2-site-template`')
    expect(agents).toContain('Parent orchestration cannot substitute for Homepage or Product implementation')
    expect(body).toContain('tio2_home_template')
    expect(body).toContain('tio2_product_template')
    expect(body).toContain('must not implement Homepage or Product work in place of those specialists')
  })
})
