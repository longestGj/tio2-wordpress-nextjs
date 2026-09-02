import {createHash} from 'node:crypto'

import registry from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-identities.json'
import m340Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m340.json'
import m350Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'
import m510Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m510.json'
import m886Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m886.json'
import m52Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m52.json'
import m895Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m895.json'
import m896Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m896.json'

type JsonValue = null | boolean | number | string | readonly JsonValue[] | {[key: string]: JsonValue}
type RegistryIdentity = (typeof registry.identities)[number]

export type MalaysiaProductDetailSlug = string

export interface ApprovedMalaysiaProductDetailEntry {
  readonly pageId: string
  readonly gradeCode: string
  readonly slug: MalaysiaProductDetailSlug
  readonly path: string
  readonly primaryKeyword: string
  readonly implementationState: string
  readonly contractFile: string
  readonly approvedSourceSha256: string
  readonly approvedCanonicalSha256: string
}

export class ProductDetailRegistryError extends Error {
  constructor(readonly field: string) {
    super(`Invalid approved Malaysia Product Detail registry field: ${field}`)
    this.name = 'ProductDetailRegistryError'
  }
}

const bundledContracts = [
  {file: 'tio2-my-product-detail-m340.json', contract: m340Contract},
  {file: 'tio2-my-product-detail-m350.json', contract: m350Contract},
  {file: 'tio2-my-product-detail-m510.json', contract: m510Contract},
  {file: 'tio2-my-product-detail-m886.json', contract: m886Contract},
  {file: 'tio2-my-product-detail-m52.json', contract: m52Contract},
  {file: 'tio2-my-product-detail-m895.json', contract: m895Contract},
  {file: 'tio2-my-product-detail-m896.json', contract: m896Contract},
] as const

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const objectValue = value as {[key: string]: JsonValue}
    return Object.fromEntries(
      Object.keys(objectValue).sort().map((key) => [key, canonicalize(objectValue[key] as JsonValue)]),
    )
  }
  return value
}

export function canonicalProductDetailContractSha256(value: unknown): string {
  const canonicalJson = JSON.stringify(canonicalize(value as JsonValue))
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex').toUpperCase()
}

export function assertApprovedProductDetailContractHash(
  value: unknown,
  expectedHash: string | undefined,
  field = 'approvedCanonicalSha256',
): void {
  if (!expectedHash || !/^[A-F0-9]{64}$/u.test(expectedHash)) {
    throw new ProductDetailRegistryError(field)
  }
  if (canonicalProductDetailContractSha256(value) !== expectedHash) {
    throw new ProductDetailRegistryError(field)
  }
}

function isApprovedEntry(identity: RegistryIdentity): identity is RegistryIdentity & ApprovedMalaysiaProductDetailEntry {
  return identity.implementationState.startsWith('APPROVED_')
}

function buildApprovedRegistry() {
  if (registry.hashAlgorithm !== 'sha256-json-recursive-key-sort-v1') {
    throw new ProductDetailRegistryError('hashAlgorithm')
  }
  const contractByFile = new Map<string, unknown>(
    bundledContracts.map(({file, contract}) => [file, contract]),
  )
  const approved = registry.identities.filter(isApprovedEntry)
  const entries = new Map<MalaysiaProductDetailSlug, {
    readonly identity: ApprovedMalaysiaProductDetailEntry
    readonly contract: unknown
  }>()
  for (const identity of approved) {
    if (
      !identity.contractFile ||
      !identity.approvedSourceSha256 ||
      !/^[A-F0-9]{64}$/u.test(identity.approvedSourceSha256) ||
      entries.has(identity.slug)
    ) throw new ProductDetailRegistryError(`identities.${identity.slug}`)
    const contract = contractByFile.get(identity.contractFile)
    if (!contract || typeof contract !== 'object') {
      throw new ProductDetailRegistryError(`identities.${identity.slug}.contractFile`)
    }
    const contractIdentity = (contract as {identity?: Record<string, unknown>}).identity
    if (
      contractIdentity?.slug !== identity.slug ||
      contractIdentity?.pageId !== identity.pageId ||
      contractIdentity?.gradeCode !== identity.gradeCode ||
      contractIdentity?.path !== identity.path ||
      contractIdentity?.siteScope !== registry.siteScope ||
      contractIdentity?.locale !== registry.locale ||
      contractIdentity?.templateVersion !== registry.templateVersion
    ) throw new ProductDetailRegistryError(`identities.${identity.slug}.contractIdentity`)
    assertApprovedProductDetailContractHash(
      contract,
      identity.approvedCanonicalSha256,
      `identities.${identity.slug}.approvedCanonicalSha256`,
    )
    entries.set(identity.slug, {identity, contract})
  }
  if (entries.size !== contractByFile.size) {
    throw new ProductDetailRegistryError('bundledContracts')
  }
  return entries
}

const approvedRegistry = buildApprovedRegistry()

export const APPROVED_MALAYSIA_PRODUCT_DETAIL_SLUGS = Object.freeze(
  [...approvedRegistry.keys()],
)

export function isApprovedMalaysiaProductDetailSlug(value: string): value is MalaysiaProductDetailSlug {
  return approvedRegistry.has(value)
}

export function getApprovedMalaysiaProductDetail(slug: string) {
  const entry = approvedRegistry.get(slug)
  if (!entry) throw new ProductDetailRegistryError(`slug.${slug}`)
  return entry
}
