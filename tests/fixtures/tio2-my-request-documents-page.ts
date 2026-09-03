import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'

export function malaysiaRequestDocumentsPageSource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-documents-page-101',
    modifiedGmt: '2026-09-03T10:00:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/request-documents'},
    malaysiaRequestDocumentsContractJson: JSON.stringify(contract),
    ...overrides,
  }
}
