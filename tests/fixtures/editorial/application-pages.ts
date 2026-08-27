export const applicationHubInput = {
  identity: {id: 'applications-hub', title: 'Synthetic Applications Hub', slug: 'applications', path: '/applications', level: 'hub', family: 'synthetic', parentId: null, modified: '2026-08-27T08:00:00'},
  seo: {title: 'Synthetic applications', description: 'Synthetic, brand-neutral evaluation guidance for fictional material applications.'},
  hero: {eyebrow: 'Synthetic application guidance', headline: 'Compare fictional application conditions systematically.', directAnswer: '<p>Use representative trials to compare fictional formulation choices before making a decision.</p>'},
  decisionGuide: {context: 'This synthetic hub groups fictional evaluation contexts.', buyerProblem: 'A buyer needs a repeatable way to frame a fictional application trial.', selectionFactors: ['End-use conditions', 'Processing route', 'Validation evidence'], powderDataLimits: 'Synthetic powder data does not replace formulation testing.', validationPlan: ['Define a control', 'Run a representative trial'], customerInputs: ['Formulation context', 'Target performance']},
  bodySections: [{id: 'overview', heading: 'Synthetic overview', html: '<p>Use this fictional overview to frame an evaluation.</p>'}, {id: 'next-steps', heading: 'Synthetic next steps', html: '<p>Record observations from the representative trial.</p>'}],
  faqs: Array.from({length: 4}, (_, index) => ({question: `Synthetic application question ${index + 1}?`, answerHtml: '<p>Use a fictional, representative test plan.</p>'})),
  children: [{type: 'application', id: 'coatings'}],
  relationships: [{type: 'resource', id: 'article-01'}, {type: 'product', id: 'TP-X999'}],
  ctas: [{kind: 'discuss-application', label: 'Discuss a synthetic application', href: '/contact/'}, {kind: 'request-sample', label: 'Request a synthetic sample', href: '/contact'}],
  disclaimerHtml: '<p>The current technical data sheet is available by request.</p>',
} as const

export const applicationCategoryInput = {
  ...applicationHubInput,
  identity: {...applicationHubInput.identity, id: 'coatings', title: 'Synthetic Coatings Category', slug: 'coatings', path: '/applications/coatings', level: 'category' as const, parentId: 'applications-hub'},
}

export const applicationDetailInput = {
  ...applicationHubInput,
  identity: {...applicationHubInput.identity, id: 'water-based-paint', title: 'Synthetic Water-Based Paint Detail', slug: 'water-based-paint', path: '/applications/water-based-paint', level: 'detail' as const, parentId: 'coatings'},
  children: [],
}
