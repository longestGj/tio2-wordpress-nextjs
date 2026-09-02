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
  it('derives exactly eleven preview-enabled contracts and leaves three identities disabled', () => {
    expect(APPROVED_MALAYSIA_PRODUCT_DETAIL_SLUGS).toEqual(['m-350', 'm-510', 'm-896', 'm-996', 'm-895', 'm-200', 'm-108', 'm-210', 'm-340', 'm-886', 'm-52'])
    expect(registry.identities.filter((item) => item.implementationState.startsWith('APPROVED_'))).toHaveLength(11)
    expect(registry.identities.filter((item) => item.implementationState.startsWith('IDENTITY_ONLY'))).toHaveLength(3)
    expect(isApprovedMalaysiaProductDetailSlug('m-350')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-510')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-896')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-895')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-340')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-886')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-52')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-108')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-210')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-200')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-996')).toBe(true)
    expect(isApprovedMalaysiaProductDetailSlug('m-2196')).toBe(false)
  })

  it('selects contracts through registry identity and validates their canonical hashes', () => {
    const m350 = getApprovedMalaysiaProductDetail('m-350')
    const m108 = getApprovedMalaysiaProductDetail('m-108')
    const m200 = getApprovedMalaysiaProductDetail('m-200')
    const m210 = getApprovedMalaysiaProductDetail('m-210')
    const m510 = getApprovedMalaysiaProductDetail('m-510')
    const m896 = getApprovedMalaysiaProductDetail('m-896')
    const m996 = getApprovedMalaysiaProductDetail('m-996')
    const m895 = getApprovedMalaysiaProductDetail('m-895')
    const m340 = getApprovedMalaysiaProductDetail('m-340')
    const m886 = getApprovedMalaysiaProductDetail('m-886')
    const m52 = getApprovedMalaysiaProductDetail('m-52')
    expect((m350.contract as {identity: {pageId: string}}).identity.pageId).toBe('GRADE-M350')
    expect((m510.contract as {identity: {pageId: string}}).identity.pageId).toBe('GRADE-M510')
    expect(canonicalProductDetailContractSha256(m350.contract)).toBe(m350.identity.approvedCanonicalSha256)
    expect(canonicalProductDetailContractSha256(m510.contract)).toBe('706A8962F5B90D857EE2595138CDEDCA4E22A7398F5C18CDCFA8E1E8186C4D22')
    expect(m510.identity.approvedSourceSha256).toBe('09B41E1AB403372495D4BE8DB3DDD1260A710E310327FC289D8D344B05AB095C')
    expect(canonicalProductDetailContractSha256(m896.contract)).toBe('4049273762F620444A14CEC3ED223C7AC44A0AB73166D058B0B625F73D7F0730')
    expect(m896.identity.approvedSourceSha256).toBe('BA735FA0570E81F8055C76B7AC7B434498446BBD5540A1F2A32F0A9E6F3EC03A')
    expect(canonicalProductDetailContractSha256(m996.contract)).toBe('695022B33674A055838DC15E2F82C1B7E20605BE32B8984E29DED4382888643B')
    expect(m996.identity.approvedSourceSha256).toBe('4EAF22AA4F3F551F27CB83B41D644CAA59312B6EF20F02BCBD9AA6522F3EC66A')
    expect(canonicalProductDetailContractSha256(m895.contract)).toBe('C05AFEDE37CD69B5DA4AE5E77C3749093CCD7DEBC004424800FE870747C68E11')
    expect(m895.identity.approvedSourceSha256).toBe('CCBAB8EF7BEBB5641F409CF0925E861D57990EB53186448473754E88B48E3A5A')
    expect(canonicalProductDetailContractSha256(m340.contract)).toBe('313F39434C74E7219A759E4A3A7F177047BA705ADF88F6441CB3B615E9852B3E')
    expect(m340.identity.approvedSourceSha256).toBe('8DF979421B4D716BA82E910A42F62BF4982102BF00D82DB2782578F5B5AB93A6')
    expect(canonicalProductDetailContractSha256(m886.contract)).toBe('9CDDABD077B99163262B77644D9C939CED343B50C3F014869F5A798254DB40B8')
    expect(m886.identity.approvedSourceSha256).toBe('D4A68225CC29B06D9B9700DB5CFA9C8D74C154C49E643A450A24B759981267B0')
    expect(canonicalProductDetailContractSha256(m52.contract)).toBe('625C28008CAB44E95062A145897BC7E7B1E1565664AA86161CF9CB79E18EC1C4')
    expect(m52.identity.approvedSourceSha256).toBe('977A72AF33377F7A3CAB12C4F72314E93CFD79F2BE0CCFCFD62A3A2D009DE1A7')
    expect(canonicalProductDetailContractSha256(m108.contract)).toBe('0579A4F1E452AB6609FAB529D86C07B1DD717039F8B8AAD9DAB37412AC0BF84B')
    expect(m108.identity.approvedSourceSha256).toBe('998C57D70AC303C0F47AC3E14B0C9214F4D53BC91130044274773B7CD3260BFF')
    expect(canonicalProductDetailContractSha256(m200.contract)).toBe('815F920541B53A6038C1B214F41F35B55F654C74BBDECEC66BF5A54585690369')
    expect(m200.identity.approvedSourceSha256).toBe('A19BDC03170470EECCC46497AFBBE4FFEF6288DB59C9C5F6163017C3DF6D8320')
    expect(canonicalProductDetailContractSha256(m210.contract)).toBe('F2CEDE18EFA0ADE179C4D5BAC72BEB25A2E8A826A825C0344757D04ABC4B8B94')
    expect(m210.identity.approvedSourceSha256).toBe('F977D5DD3C49119966CD3C4EC5E846448BBFBD5BE1F4846B82B8CD1CBA6463B2')
  })

  it('fails closed for wrong, missing or malformed approved hashes', () => {
    const contract = getApprovedMalaysiaProductDetail('m-510').contract
    for (const hash of [undefined, '', '0'.repeat(64), 'not-a-sha256']) {
      expect(() => assertApprovedProductDetailContractHash(contract, hash)).toThrow(ProductDetailRegistryError)
    }
    expect(() => getApprovedMalaysiaProductDetail('m-2196')).toThrow(ProductDetailRegistryError)
  })

  it('fails closed when the approved M-896 contract is checked against a wrong or missing hash', () => {
    const contract = getApprovedMalaysiaProductDetail('m-896').contract
    expect(() => assertApprovedProductDetailContractHash(contract, '0'.repeat(64))).toThrow(ProductDetailRegistryError)
    expect(() => assertApprovedProductDetailContractHash(contract, undefined)).toThrow(ProductDetailRegistryError)
  })
})
