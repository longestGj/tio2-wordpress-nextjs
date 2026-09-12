import {it,expect} from 'vitest'
import {installedContentWithDeliveredText} from '@/lib/wordpress/content-release-validation'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'
it('binds editable related-grade text to identity when an earlier relation is omitted',()=>{
 const candidate=structuredClone(contract)
 candidate.relatedGrades.items=candidate.relatedGrades.items.slice(1)
 candidate.relatedGrades.items[0].body='Updated evaluation text.'
 const delivered=installedContentWithDeliveredText(candidate,contract)
 expect(delivered.relatedGrades.items[0].body).toBe(contract.relatedGrades.items[0].body)
 expect(delivered.relatedGrades.items[1].body).toBe('Updated evaluation text.')
})
