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
  it('derives exactly three preview-enabled contracts and leaves 11 identities disabled', () => {
    expect(APPROVED_MALAYSIA_PRODUCT_DETAIL_SLUGS).toEqual(['m-350', 'm-510', 'm-896'])
    expect(registry.identities.filter((item) => item.implementationState.startsWith('APPROVED_'))).toHaveLength(3)
    expect(registry.identities.filter((item) => item.implementationState.startsWith('IDENTITY_ONLY'))).toHaveLength(11)
    expect(isApprovedMalaysiaProductDetailSlug('m-350')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-510')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-896')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-996')).toBe(false)
  })

  it('selects contracts through registry identity and validates their canonical hashes', () => {
    const m350 = getApprovedMalaysiaProductDetail('m-350')
    const m510 = getApprovedMalaysiaProductDetail('m-510')
    const m896 = getApprovedMalaysiaProductDetail('m-896')
    expect((m350.contract as {identity: {pageId: string}}).identity.pageId).toBe('GRADE-M350')
    expect((m510.contract as {identity: {pageId: string}}).identity.pageId).toBe('GRADE-M510')
    expect(canonicalProductDetailContractSha256(m350.contract)).toBe(m350.identity.approvedCanonicalSha256)
    expect(canonicalProductDetailContractSha256(m510.contract)).toBe('706A8962F5B90D857EE2595138CDEDCA4E22A7398F5C18CDCFA8E1E8186C4D22')
    expect(m510.identity.approvedSourceSha256).toBe('09B41E1AB403372495D4BE8DB3DDD1260A710E310327FC289D8D344B05AB095C')
    expect(canonicalProductDetailContractSha256(m896.contract)).toBe('4049273762F620444A14CEC3ED223C7AC44A0AB73166D058B0B625F73D7F0730')
    expect(m896.identity.approvedSourceSha256).toBe('BA735FA0570E81F8055C76B7AC7B434498446BBD5540A1F2A32F0A9E6F3EC03A')
  })

  it('fails closed for wrong, missing or malformed approved hashes', () => {
    const contract = getApprovedMalaysiaProductDetail('m-510').contract
    for (const hash of [undefined, '', '0'.repeat(64), 'not-a-sha256']) {
      expect(() => assertApprovedProductDetailContractHash(contract, hash)).toThrow(ProductDetailRegistryError)
    }
    expect(() => getApprovedMalaysiaProductDetail('m-996')).toThrow(ProductDetailRegistryError)
  })

  it('fails closed when the approved M-896 contract is checked against a wrong or missing hash', () => {
    const contract = getApprovedMalaysiaProductDetail('m-896').contract
    expect(() => assertApprovedProductDetailContractHash(contract, '0'.repeat(64))).toThrow(ProductDetailRegistryError)
    expect(() => assertApprovedProductDetailContractHash(contract, undefined)).toThrow(ProductDetailRegistryError)
  })
})
