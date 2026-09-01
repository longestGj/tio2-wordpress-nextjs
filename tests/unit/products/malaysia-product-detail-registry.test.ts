import {describe, expect, it} from 'vitest'

import {
  APPROVED_MALAYSIA_PRODUCT_DETAIL_SLUGS,
  ProductDetailRegistryError,
  assertApprovedProductDetailContractHash,
  canonicalProductDetailContractSha256,
  getApprovedMalaysiaProductDetail,
  isApprovedMalaysiaProductDetailSlug,
} from '@/lib/wordpress/product-detail-v01-registry'
import registry from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-identities.json'

describe('Malaysia Product Detail approval registry', () => {
  it('derives exactly two preview-enabled contracts and leaves 12 identities disabled', () => {
    expect(APPROVED_MALAYSIA_PRODUCT_DETAIL_SLUGS).toEqual(['m-350', 'm-510'])
    expect(registry.identities.filter((item) => item.implementationState.startsWith('APPROVED_'))).toHaveLength(2)
    expect(registry.identities.filter((item) => item.implementationState.startsWith('IDENTITY_ONLY'))).toHaveLength(12)
    expect(isApprovedMalaysiaProductDetailSlug('m-350')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-510')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-896')).toBe(false)
  })

  it('selects contracts through registry identity and validates their canonical hashes', () => {
    const m350 = getApprovedMalaysiaProductDetail('m-350')
    const m510 = getApprovedMalaysiaProductDetail('m-510')
    expect((m350.contract as {identity: {pageId: string}}).identity.pageId).toBe('GRADE-M350')
    expect((m510.contract as {identity: {pageId: string}}).identity.pageId).toBe('GRADE-M510')
    expect(canonicalProductDetailContractSha256(m350.contract)).toBe(m350.identity.approvedCanonicalSha256)
    expect(canonicalProductDetailContractSha256(m510.contract)).toBe('706A8962F5B90D857EE2595138CDEDCA4E22A7398F5C18CDCFA8E1E8186C4D22')
    expect(m510.identity.approvedSourceSha256).toBe('09B41E1AB403372495D4BE8DB3DDD1260A710E310327FC289D8D344B05AB095C')
  })

  it('fails closed for wrong, missing or malformed approved hashes', () => {
    const contract = getApprovedMalaysiaProductDetail('m-510').contract
    for (const hash of [undefined, '', '0'.repeat(64), 'not-a-sha256']) {
      expect(() => assertApprovedProductDetailContractHash(contract, hash)).toThrow(ProductDetailRegistryError)
    }
    expect(() => getApprovedMalaysiaProductDetail('m-896')).toThrow(ProductDetailRegistryError)
  })
})
