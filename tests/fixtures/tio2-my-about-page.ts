import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-about-page.json'

export function malaysiaAboutPageSource(options: {scope?: string; tamper?: boolean} = {}) {
  const contract = structuredClone(approvedContract)
  if (options.tamper) contract.hero.h1 = 'Tampered About page'
  return {
    id: 'about-page-901',
    modifiedGmt: '2026-09-01T08:30:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: options.scope ?? 'tio2-my'}]},
    publishingFields: {publicPath: '/about'},
    malaysiaAboutPageContractJson: JSON.stringify(contract),
  }
}
