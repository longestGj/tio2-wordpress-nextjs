export const resourceHubInput = {
  identity: {id: 'resources-hub', title: 'Synthetic Technical Resources', slug: 'resources', path: '/resources', kind: 'hub', cluster: 'synthetic', modified: '2026-08-27T08:00:00'},
  seo: {title: 'Synthetic technical resources', description: 'Synthetic, brand-neutral articles about fictional material evaluation.'},
  hero: {eyebrow: 'Synthetic technical guidance', headline: 'Turn fictional observations into a repeatable comparison.', directAnswer: '<p>Use consistent methods and representative conditions when comparing fictional material options.</p>'},
  keyTakeaways: ['Use representative conditions.', 'Record the comparison method.', 'Confirm outcomes in the intended system.'],
  sections: [{id: 'method', heading: 'Synthetic method', html: '<p>Start with a fictional control and a documented method.</p>'}, {id: 'review', heading: 'Synthetic review', html: '<p>Review results against the intended fictional use.</p>'}],
  comparisonTable: {columns: ['Synthetic option', 'Observation'], rows: [['Option A', 'Record a result']]},
  practicalImplications: ['Choose a comparable process.'], commonMistakes: ['Do not rely on an unrepresentative trial.'], evaluationMethod: ['Define the test conditions.'],
  faqs: Array.from({length: 4}, (_, index) => ({question: `Synthetic resource question ${index + 1}?`, answerHtml: '<p>Document the fictional evaluation boundary.</p>'})),
  children: [{type: 'resource', id: 'article-01'}], relationships: [{type: 'application', id: 'coatings'}, {type: 'product', id: 'TP-X999'}],
  ctas: [{kind: 'discuss-application', label: 'Discuss a synthetic application', href: '/contact/'}, {kind: 'request-tds', label: 'Request technical data', href: '/contact'}],
  disclaimerHtml: '<p>The current technical data sheet is available by request.</p>',
} as const

export const resourceArticleInput = {
  ...resourceHubInput,
  identity: {...resourceHubInput.identity, id: 'article-01', title: 'Synthetic Resource Article', slug: 'article-01', path: '/resources/article-01', kind: 'article' as const},
  children: [],
}
