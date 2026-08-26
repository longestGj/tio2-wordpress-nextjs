import type {
  ContentPageFieldsFragment,
  SiteAEditorialHomepageFieldsFragment,
} from '@/lib/wordpress/generated'
import {HOMEPAGE_RFQ_COPY_CONTRACTS} from '@/lib/wordpress/homepage-rfq-copy'
import type {SiteId} from '@/sites'

export const graphqlEndpoint = 'http://wordpress.test/graphql'

export function makeContentPageNode(
  overrides: Partial<ContentPageFieldsFragment> = {},
): ContentPageFieldsFragment {
  return {
    __typename: 'Page',
    id: 'cG9zdDoxMDE=',
    title: 'Coatings',
    content: '<p>Coatings content.</p>',
    modifiedGmt: '2026-08-23T08:30:00',
    status: 'publish',
    publishingFields: {
      __typename: 'PublishingFields',
      publicPath: '/applications/coatings',
      seoTitle: 'Titanium Dioxide for Coatings',
      seoDescription: 'Choose titanium dioxide grades for coatings.',
    },
    siteScopes: {
      __typename: 'PageToSiteScopeConnection',
      nodes: [
        {
          __typename: 'SiteScope',
          id: 'dGVybTox',
          slug: 'tio2-a',
        },
      ],
    },
    ...overrides,
  }
}

export function makeHomepageNode(siteId: SiteId = 'tio2-a') {
  const rfqCopy = HOMEPAGE_RFQ_COPY_CONTRACTS[siteId].fields
  return {
    __typename: 'Tio2Homepage' as const,
    id: 'aG9tZXBhZ2U6MTAx',
    databaseId: 101,
    modifiedGmt: '2026-08-23T08:30:00',
    status: 'publish',
    siteScopes: {
      nodes: [{__typename: 'SiteScope' as const, slug: siteId}],
    },
    homepageFields: {
      homepageSchemaVersion: 'homepage-v0.1',
      heroEyebrow: 'Industrial titanium dioxide',
      heroHeading: 'Reliable TiO2 supply',
      heroSummary: 'Owned production for selected grades; partner production for others.',
      heroPrimaryLabel: 'Request a quote',
      heroSecondaryLabel: 'Explore products',
      heroSecondaryPath: '/products',
      heroImage: null,
      heroImageAlt: '',
      metrics: [],
      productsHeading: 'Product routes',
      productsIntro: 'Compare grades by end use.',
      productRoutes: [
        {productTitle: 'Rutile grades', productSummary: 'Grades for coatings and plastics.', productPath: '/products/rutile', productImage: null, productImageAlt: ''},
        {productTitle: 'Anatase grades', productSummary: 'Grades for specialist applications.', productPath: '/products/anatase', productImage: null, productImageAlt: ''},
      ],
      applicationsHeading: 'Applications',
      applicationsIntro: 'Start with the performance target.',
      applications: [
        {applicationName: 'Coatings', applicationSummary: 'Opacity and weathering routes.', applicationPath: '/applications/coatings', applicationImage: null, applicationImageAlt: ''},
        {applicationName: 'Plastics', applicationSummary: 'Dispersion and processability routes.', applicationPath: '/applications/plastics', applicationImage: null, applicationImageAlt: ''},
        {applicationName: 'Paper', applicationSummary: 'Brightness and opacity routes.', applicationPath: '/applications/paper', applicationImage: null, applicationImageAlt: ''},
      ],
      inquiryHeading: 'A clear inquiry process',
      inquirySteps: [
        {inquiryStepTitle: 'Share requirements', inquiryStepDescription: 'Tell us the use and target properties.'},
        {inquiryStepTitle: 'Review options', inquiryStepDescription: 'Compare technically suitable routes.'},
        {inquiryStepTitle: 'Confirm next step', inquiryStepDescription: 'Align documentation and commercial details.'},
      ],
      trustHeading: 'A bounded supply claim',
      trustIntro: 'We distinguish owned and partner production.',
      trustReasons: [
        {trustReasonTitle: 'Product-specific sourcing', trustReasonDescription: 'The route identifies owned or partner production.', trustReasonClaimBasis: ['user_confirmed'], trustReasonEvidenceUrl: ''},
        {trustReasonTitle: 'Document review', trustReasonDescription: 'Documents are matched to the offered grade.', trustReasonClaimBasis: ['user_confirmed'], trustReasonEvidenceUrl: ''},
        {trustReasonTitle: 'Evidence-aware claims', trustReasonDescription: 'Third-party claims require a source.', trustReasonClaimBasis: ['source_required'], trustReasonEvidenceUrl: 'https://example.com/evidence'},
      ],
      rfqHeading: 'Prepare a local inquiry',
      rfqIntro: [rfqCopy['rfq.intro'][0]],
      rfqLabels: {
        rfqLabelName: 'Name',
        rfqLabelCompany: 'Company',
        rfqLabelCountryRegion: 'Country / Region',
        rfqLabelWorkEmail: 'Work email',
        rfqLabelBuyerType: 'Buyer type',
        rfqLabelInterest: 'Product or application interest',
        rfqLabelExpectedQuantity: 'Expected quantity',
        rfqLabelDestination: 'Destination',
        rfqLabelMessage: 'Message',
        rfqLabelPrivacy: 'I understand this is a local demo.',
        rfqBuyerIndustrialLabel: 'Industrial buyer',
        rfqBuyerDistributorLabel: 'Distributor',
        rfqBuyerOtherLabel: 'Other business buyer',
      },
      rfqSubmitLabel: 'Review inquiry',
      rfqPrivacyText: [rfqCopy['rfq.privacyText'][0]],
      rfqSuccessHeading: [rfqCopy['rfq.success.heading'][0]],
      rfqSuccessMessage: [rfqCopy['rfq.success.message'][0]],
      faqHeading: 'Frequently asked questions',
      faqs: [
        {faqQuestion: 'Which grade should I choose?', faqAnswer: 'Start with the application and performance target.', faqRelatedLabel: 'Browse rutile grades', faqRelatedPath: '/products/rutile'},
        {faqQuestion: 'Can I request documents?', faqAnswer: 'State the grade and document needed in the inquiry.', faqRelatedLabel: '', faqRelatedPath: ''},
        {faqQuestion: 'Is every product made in an owned plant?', faqAnswer: 'No. Some products use OEM or partner production.', faqRelatedLabel: '', faqRelatedPath: ''},
      ],
      closingHeading: 'Define the right supply route',
      closingBody: 'Share the application, destination, and expected quantity.',
      closingLabel: 'Start local inquiry',
      seoTitle: 'Titanium Dioxide Supplier | TiO2 Products',
      seoDescription: 'Compare titanium dioxide grades, applications, evidence, and supply routes.',
      ogImage: null,
      primaryTopic: 'titanium dioxide supplier',
      secondaryTopics: [
        {secondaryTopic: 'rutile titanium dioxide'},
        {secondaryTopic: 'anatase titanium dioxide'},
      ],
    },
  }
}

export function makeSiteAEditorialHomepageNode(): SiteAEditorialHomepageFieldsFragment {
  return {
    id: 'aG9tZXBhZ2U6MTAx',
    databaseId: 101,
    modifiedGmt: '2026-08-26T08:30:00',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-a'}]},
    homepageFields: {
      homepageSchemaVersion: 'homepage-v0.2-editorial-geo',
      heroEyebrow: 'Synthetic buyer question framework',
      heroHeading: 'A Buyer-Led Guide to Clarifying Titanium Dioxide Requirements',
      heroSummary: 'This synthetic local editorial fixture organizes questions for a demo review; it does not claim product fit, supply capability, or commercial availability.',
      heroImage: null,
      heroImageAlt: '',
      closingHeading: 'Turn the open questions into an RFQ brief',
      closingBody: 'Record the use context, requested documents, destination, and buyer checks before choosing any separately authorized follow-up.',
      closingLabel: 'Start an RFQ',
      seoTitle: 'Synthetic TiO2 Buyer Questions | Site A',
      seoDescription: 'A local synthetic editorial fixture that organizes titanium dioxide sourcing questions without product, supply, or commercial claims.',
      ogImage: null,
      primaryTopic: 'titanium dioxide sourcing questions',
      secondaryTopics: [
        {secondaryTopic: 'buyer-defined requirements'},
        {secondaryTopic: 'document review questions'},
        {secondaryTopic: 'supply-route verification'},
      ],
    },
    editorialGeoFields: {
      headerRfqLabel: 'Start an RFQ',
      directAnswerQuestion: 'What should a buyer clarify before sourcing titanium dioxide?',
      directAnswerLead: 'Begin with the intended use context, buyer-defined acceptance criteria, requested documents, route assumptions, destination, and the review steps that remain open.',
      directAnswerBody: 'This synthetic demo is an editorial checklist rather than technical or commercial guidance. A buyer should confirm each requirement with its own specialists, tests, source documents, and authorized supplier contacts.',
      decisionQuestions: [
        {decisionNumber: '01', decisionQuestion: 'Which use context should the request describe?', decisionAnswer: 'Describe the process, substrate or material, and decision stage in buyer-owned terms. This demo does not determine suitability for any use.'},
        {decisionNumber: '02', decisionQuestion: 'Which attributes need buyer-defined acceptance criteria?', decisionAnswer: 'List only criteria supplied by the buyer or its reviewers, together with the method and approval owner. The fixture supplies no target values.'},
        {decisionNumber: '03', decisionQuestion: 'Which documents should be requested for review?', decisionAnswer: 'Name the document categories and revision expectations the buyer wants to inspect. Availability and applicability require separate confirmation.'},
        {decisionNumber: '04', decisionQuestion: 'Which supply-route assumptions require clarification?', decisionAnswer: 'Ask who performs each stated role and which records could support the description. Route labels in this fixture are synthetic examples only.'},
        {decisionNumber: '05', decisionQuestion: 'Which logistics details belong in the RFQ brief?', decisionAnswer: 'Record buyer-provided destination, timing, packaging, and quantity context without treating the demo as an offer or commitment.'},
        {decisionNumber: '06', decisionQuestion: 'Which evidence and approval steps remain open?', decisionAnswer: 'Assign buyer-side review owners and mark every unresolved item for confirmation before any sourcing decision.'},
      ],
      applicationBriefs: [
        {applicationName: 'Coatings discussion context', applicationSummary: "A synthetic prompt for describing the buyer's coating process and decision stage.", applicationConsiderations: 'The buyer should define its own substrate, formulation, test methods, acceptance criteria, and review owners.'},
        {applicationName: 'Plastics discussion context', applicationSummary: "A synthetic prompt for recording the buyer's polymer and processing context.", applicationConsiderations: 'Material compatibility, processing conditions, and acceptance criteria remain buyer-verification items.'},
        {applicationName: 'Masterbatch discussion context', applicationSummary: "A synthetic prompt for identifying the buyer's concentration and downstream-use questions.", applicationConsiderations: 'The buyer should confirm formulation inputs, evaluation methods, and downstream requirements independently.'},
        {applicationName: 'Inks discussion context', applicationSummary: "A synthetic prompt for documenting the buyer's ink system and review questions.", applicationConsiderations: 'The buyer owns the selection of test methods, substrates, process conditions, and approval criteria.'},
        {applicationName: 'Paper discussion context', applicationSummary: "A synthetic prompt for describing the buyer's paper-making or converting context.", applicationConsiderations: 'Process fit, evaluation methods, document needs, and acceptance criteria require buyer verification.'},
      ],
      supplyRoutes: [
        {routeName: 'Synthetic owned-production route', routeMeaning: 'A demo label for a seller-described owned-production scenario; it confirms no real facility, source, or supply relationship.', buyerVerification: 'Ask the seller to identify the responsible legal entity and source, then verify the answer through buyer-approved channels.', documentationContext: 'Request only the source and document details the buyer needs for its review.', claimBasis: ['synthetic_demo'], evidenceUrl: ''},
        {routeName: 'Synthetic OEM or partner-production route', routeMeaning: 'A demo label for a seller-described third-party production scenario; it confirms no real partner or commercial arrangement.', buyerVerification: 'Ask which party performs each role and how the buyer can independently review that description.', documentationContext: 'Record which party issues each requested document and which revisions the buyer expects to inspect.', claimBasis: ['synthetic_demo'], evidenceUrl: ''},
        {routeName: 'Synthetic distribution route', routeMeaning: 'A demo label for a distribution scenario; it confirms no inventory, authorization, or trading relationship.', buyerVerification: 'Ask for the chain of responsibility, source identity, and authorization evidence required by the buyer.', documentationContext: 'Clarify document origin, revision handling, and buyer-side review ownership.', claimBasis: ['synthetic_demo'], evidenceUrl: ''},
      ],
      evidenceItems: [
        {documentType: 'Technical data request', documentTitle: 'Synthetic technical-data checklist item', documentSummary: 'A demo reminder to request buyer-relevant technical information; no actual document or value is supplied.', applicability: 'The buyer decides whether the category and revision are relevant to its review.', revisionLabel: 'Demo only', evidenceUrl: '', verificationStatus: ['demo']},
        {documentType: 'Safety information request', documentTitle: 'Synthetic safety-information checklist item', documentSummary: 'A demo reminder to request current safety information through an authorized channel; no actual document is represented.', applicability: 'Buyer specialists determine the required jurisdiction, language, revision, and review process.', revisionLabel: 'Demo only', evidenceUrl: '', verificationStatus: ['demo']},
        {documentType: 'Supply-route declaration request', documentTitle: 'Synthetic route-declaration checklist item', documentSummary: 'A demo reminder to ask who performs stated production, distribution, and documentation roles.', applicability: 'The buyer defines what evidence is needed before accepting any route description.', revisionLabel: 'Demo only', evidenceUrl: '', verificationStatus: ['demo']},
      ],
      evaluationSteps: [
        {methodNumber: '01', methodTitle: 'Define the buyer context', methodDescription: 'Record the intended use context, decision stage, and buyer-side owners without inferring product fit.'},
        {methodNumber: '02', methodTitle: 'Write acceptance questions', methodDescription: 'Translate buyer requirements into questions, methods, and approval checkpoints without inventing target values.'},
        {methodNumber: '03', methodTitle: 'Request the review set', methodDescription: 'List the documents, revisions, and route explanations the buyer wants to inspect.'},
        {methodNumber: '04', methodTitle: 'Plan independent evaluation', methodDescription: 'Let buyer specialists choose samples, tests, controls, and interpretation rules outside this demo.'},
        {methodNumber: '05', methodTitle: 'Log open decisions', methodDescription: 'Keep unresolved evidence, ownership, and approval items visible until the buyer closes them.'},
      ],
      geoFaqs: [
        {faqQuestion: 'Does this page recommend a product?', faqAnswer: 'No. It is a synthetic local checklist for organizing buyer questions and does not recommend any product.'},
        {faqQuestion: 'Does an application brief establish suitability?', faqAnswer: 'No. Each brief is a demo prompt; the buyer must define and independently evaluate suitability.'},
        {faqQuestion: 'Are the supply routes real?', faqAnswer: 'No. The route labels are synthetic scenarios and confirm no facility, source, partner, inventory, or commercial relationship.'},
        {faqQuestion: 'Are actual documents available from this fixture?', faqAnswer: 'No. Evidence items are demo checklist entries, not controlled documents or proof.'},
        {faqQuestion: 'Who defines acceptance criteria?', faqAnswer: 'The buyer and its authorized reviewers define the criteria, methods, and approval process.'},
        {faqQuestion: 'Can the fixture confirm availability or delivery?', faqAnswer: 'No. Availability, timing, packaging, destination, and quantity require separate buyer verification through an authorized channel.'},
        {faqQuestion: 'What should happen before a sourcing decision?', faqAnswer: 'The buyer should close its open document, route, evaluation, and approval questions using its own review process.'},
        {faqQuestion: 'What does the editorial review metadata mean?', faqAnswer: 'It identifies the date and scope of this synthetic local content review; it does not validate external facts.'},
      ],
      glossaryItems: [
        {term: 'Buyer-defined criterion', definition: 'A requirement, method, or acceptance rule supplied and owned by the buyer or its authorized reviewer.'},
        {term: 'Demo evidence item', definition: 'A synthetic checklist entry that represents no actual document, proof, or external fact.'},
        {term: 'Supply-route label', definition: 'A descriptive scenario that remains unconfirmed until the buyer reviews the responsible entities and supporting records.'},
        {term: 'Editorial review scope', definition: 'The stated boundary of the local content review, not an approval of technical or commercial claims.'},
      ],
      editorialReviewedAt: '2026-08-26T00:00:00.000Z',
      editorialReviewedBy: 'Synthetic local editorial review',
      editorialReviewScope: 'Local experimental content only',
    },
  }
}
