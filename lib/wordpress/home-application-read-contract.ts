import schema from '@/wordpress/plugins/tio2-site-model/config/tio2-my-home-application-read-contract.json'
import type {MalaysiaHomepageContent} from './homepage-v04-types'
import type {MalaysiaApplicationHubContent} from './application-hub-v01-types'

type Node = string | number | boolean | {[key: string]: Node | readonly Node[]}
type Shape = {[key: string]: Node | readonly Node[]}
const definitions = schema.definitions as Record<string, Shape>
const fail = (path: string): never => {throw new Error(`Invalid Malaysia read content: ${path}`)}
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

function expand(node: Shape): Shape {
  if (typeof node.$ref !== 'string') return node
  const {$ref, ...overrides} = node
  return {...expand(definitions[$ref as string]!), ...overrides}
}
function identity(value: unknown, key: string, technical = false): string | undefined {
  let current: unknown = value
  for (const part of key.split('.')) {
    if (!isObject(current)) return undefined
    current = (technical ? expand(current as Shape) : current)[part]
  }
  if (technical && isObject(current) && Array.isArray(current.$values)) current = current.$values
  if (Array.isArray(current) && current.every(item => typeof item === 'string')) return JSON.stringify([...current].sort())
  return typeof current === 'string' ? current : undefined
}
function project(value: unknown, definition: Node, path: string): unknown {
  if (definition === '$text' || definition === '$alt' || definition === '$tracking') {
    if (typeof value !== 'string' || value.trim() !== value || (definition !== '$alt' && !value) ||
      /[<>\u0000-\u001f\u007f\p{Cs}]/u.test(value) || [...value].length > schema.textMaxCodePoints ||
      (definition === '$tracking' && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(value))) fail(path)
    return value
  }
  if (!isObject(definition)) {
    if (value !== definition) fail(path)
    return value
  }
  const node = expand(definition as Shape)
  if ('$values' in node) {
    const expected = node.$values as readonly string[]
    if (!Array.isArray(value) || value.length !== expected.length || value.some(item => typeof item !== 'string' || !expected.includes(item)) || new Set(value).size !== value.length) fail(path)
    return [...value as string[]]
  }
  if ('$list' in node) {
    if (!Array.isArray(value) || value.length < schema.contentArrayMin || value.length > schema.contentArrayMax) fail(path)
    return (value as unknown[]).map((item, index) => project(item, node.$list as Node, `${path}.${index}`))
  }
  if ('$members' in node) {
    const members = node.$members as readonly Shape[]
    if (!Array.isArray(value) || value.length !== members.length) fail(path)
    const seen = new Set<string>()
    return (value as unknown[]).map((item, index) => {
      const id = identity(item, node.$key as string)
      const member = members.find(candidate => identity(candidate, node.$key as string, true) === id)
      if (id === undefined || !member || seen.has(id)) fail(`${path}.${index}`)
      seen.add(id!)
      return project(item, {...expand(node.$item as Shape), ...member}, `${path}.${index}`)
    })
  }
  if (!isObject(value)) fail(path)
  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(node)) {
    if (!Object.hasOwn(value as object, key)) fail(`${path}.${key}`)
    result[key] = project((value as Record<string, unknown>)[key], child as Node, `${path}.${key}`)
  }
  return result
}

export function validateMalaysiaHomepageReadContent(value: unknown): MalaysiaHomepageContent {
  return project(value, schema.pages['HOME-001'] as unknown as Node, 'HOME-001') as MalaysiaHomepageContent
}
export function validateMalaysiaApplicationHubReadContent(value: unknown): MalaysiaApplicationHubContent {
  return project(value, schema.pages['APP-000'] as unknown as Node, 'APP-000') as MalaysiaApplicationHubContent
}
