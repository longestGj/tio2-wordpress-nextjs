import type {ContentPageFieldsFragment} from '@/lib/wordpress/generated'
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
