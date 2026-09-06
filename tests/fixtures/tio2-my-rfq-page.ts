import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'

export function malaysiaRfqPageSource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rfq-page-101',
    modifiedGmt: '2026-09-01T10:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/request-a-quote'},
    malaysiaRfqPageContractJson: JSON.stringify(contract),
    ...overrides,
  }
}
