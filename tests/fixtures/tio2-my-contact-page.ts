import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-contact-page.json'

export function malaysiaContactPageSource(options: {
  readonly scope?: string
  readonly status?: string
  readonly path?: string
  readonly mutateFact?: 'generalInquiries' | 'operatingCompany' | 'manufacturingSite'
  readonly omitFact?: 'generalInquiries' | 'operatingCompany' | 'manufacturingSite'
} = {}) {
  const content = structuredClone(contract)
  if (options.mutateFact) content.contactDetails[options.mutateFact].value = 'Unapproved value'
  if (options.omitFact) content.contactDetails[options.omitFact].value = ''
  return {
    id: 'contact-page-1001',
    modifiedGmt: '2026-09-10T08:00:00',
    status: options.status ?? 'publish',
    siteScopes: {nodes: [{slug: options.scope ?? 'tio2-my'}]},
    publishingFields: {publicPath: options.path ?? '/contact'},
    malaysiaContactPageContractJson: JSON.stringify(content),
  }
}
