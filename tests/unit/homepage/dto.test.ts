import {describe, expect, it} from 'vitest'

import {
  HomepageContractError,
  HomepageVersionError,
  toHomepageDto,
} from '@/lib/wordpress/homepage-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'

const image = {
  node: {
    __typename: 'MediaItem' as const,
    mediaItemUrl: 'https://wordpress.test/wp-content/uploads/hero.webp',
    altText: 'Titanium dioxide production line',
    mediaDetails: {width: 1200, height: 800},
    mimeType: 'image/webp',
  },
}

const completeHomepage = {
  __typename: 'Tio2Homepage' as const,
  id: 'aG9tZXBhZ2U6MTAx',
  databaseId: 101,
  modifiedGmt: '2026-08-23T08:30:00',
  status: 'publish',
  siteScopes: {
    nodes: [{__typename: 'SiteScope' as const, slug: 'tio2-a'}],
  },
  homepageFields: {
    homepageSchemaVersion: ' homepage-v0.1 ',
    heroEyebrow: ' Industrial titanium dioxide ',
    heroHeading: ' Reliable TiO2 supply ',
    heroSummary: ' Owned production for selected grades; partner production for others. ',
    heroPrimaryLabel: ' Request a quote ',
    heroSecondaryLabel: ' Explore products ',
    heroSecondaryPath: ' /products ',
    heroImage: image,
    heroImageAlt: ' Titanium dioxide production line ',
    metrics: [
      {
        metricValue: ' 20 ',
        metricUnit: ' years ',
        metricLabel: ' Export experience ',
        metricContext: ' User-confirmed operating history ',
        metricClaimBasis: ['user_confirmed'],
        metricEvidenceUrl: '',
      },
    ],
    productsHeading: ' Product routes ',
    productsIntro: ' Compare grades by end use. ',
    productRoutes: [
      {
        productTitle: ' Rutile grades ',
        productSummary: ' Grades for coatings and plastics. ',
        productPath: ' /products/rutile ',
        productImage: null,
        productImageAlt: '',
      },
      {
        productTitle: ' Anatase grades ',
        productSummary: ' Grades for fibers and specialist applications. ',
        productPath: ' /products/anatase ',
        productImage: image,
        productImageAlt: ' Bagged anatase titanium dioxide ',
      },
    ],
    applicationsHeading: ' Applications ',
    applicationsIntro: ' Start with the performance target. ',
    applications: [
      {
        applicationName: ' Coatings ',
        applicationSummary: ' Opacity and weathering routes. ',
        applicationPath: ' /applications/coatings ',
        applicationImage: null,
        applicationImageAlt: '',
      },
      {
        applicationName: ' Plastics ',
        applicationSummary: ' Dispersion and processability routes. ',
        applicationPath: ' /applications/plastics ',
        applicationImage: null,
        applicationImageAlt: '',
      },
      {
        applicationName: ' Paper ',
        applicationSummary: ' Brightness and opacity routes. ',
        applicationPath: ' /applications/paper ',
        applicationImage: null,
        applicationImageAlt: '',
      },
    ],
    inquiryHeading: ' A clear inquiry process ',
    inquirySteps: [
      {inquiryStepTitle: ' Share requirements ', inquiryStepDescription: ' Tell us the use and target properties. '},
      {inquiryStepTitle: ' Review options ', inquiryStepDescription: ' Compare technically suitable routes. '},
      {inquiryStepTitle: ' Confirm next step ', inquiryStepDescription: ' Align documentation, sample, and commercial details. '},
    ],
    trustHeading: ' A bounded supply claim ',
    trustIntro: ' We distinguish owned and partner production. ',
    trustReasons: [
      {
        trustReasonTitle: ' Product-specific sourcing ',
        trustReasonDescription: ' The route identifies owned or partner production. ',
        trustReasonClaimBasis: ['user_confirmed'],
        trustReasonEvidenceUrl: '',
      },
      {
        trustReasonTitle: ' Document review ',
        trustReasonDescription: ' Documents are matched to the offered grade. ',
        trustReasonClaimBasis: ['user_confirmed'],
        trustReasonEvidenceUrl: '',
      },
      {
        trustReasonTitle: ' Evidence-aware claims ',
        trustReasonDescription: ' Third-party claims require a source. ',
        trustReasonClaimBasis: ['source_required'],
        trustReasonEvidenceUrl: 'https://example.com/evidence',
      },
    ],
    rfqHeading: ' Prepare a local inquiry ',
    rfqIntro: ' This local demo does not send or store your inquiry. ',
    rfqLabels: {
      rfqLabelName: ' Name ',
      rfqLabelCompany: ' Company ',
      rfqLabelCountryRegion: ' Country / Region ',
      rfqLabelWorkEmail: ' Work email ',
      rfqLabelBuyerType: ' Buyer type ',
      rfqLabelInterest: ' Product or application interest ',
      rfqLabelExpectedQuantity: ' Expected quantity ',
      rfqLabelDestination: ' Destination ',
      rfqLabelMessage: ' Message ',
      rfqLabelPrivacy: ' I understand this is a local demo. ',
      rfqBuyerIndustrialLabel: ' Industrial buyer ',
      rfqBuyerDistributorLabel: ' Distributor ',
      rfqBuyerOtherLabel: ' Other business buyer ',
    },
    rfqSubmitLabel: ' Review inquiry ',
    rfqPrivacyText: ' The local demo does not send or save this information. ',
    rfqSuccessHeading: ' Local review complete ',
    rfqSuccessMessage: ' Nothing was transmitted or saved. ',
    faqHeading: ' Frequently asked questions ',
    faqs: [
      {faqQuestion: ' Which grade should I choose? ', faqAnswer: ' Start with the application and performance target. ', faqRelatedLabel: ' Browse rutile grades ', faqRelatedPath: ' /products/rutile '},
      {faqQuestion: ' Can I request documents? ', faqAnswer: ' State the grade and document needed in the inquiry. ', faqRelatedLabel: '', faqRelatedPath: ''},
      {faqQuestion: ' Is every product made in an owned plant? ', faqAnswer: ' No. Some products use OEM or partner production. ', faqRelatedLabel: '', faqRelatedPath: ''},
    ],
    closingHeading: ' Define the right supply route ',
    closingBody: ' Share the application, destination, and expected quantity. ',
    closingLabel: ' Start local inquiry ',
    seoTitle: ' Titanium Dioxide Supplier | TiO2 Products ',
    seoDescription: ' Compare titanium dioxide grades, applications, evidence, and supply routes. ',
    ogImage: null,
    primaryTopic: ' titanium dioxide supplier ',
    secondaryTopics: [
      {secondaryTopic: ' rutile titanium dioxide '},
      {secondaryTopic: ' anatase titanium dioxide '},
    ],
  },
}

function cloneHomepage(): typeof completeHomepage {
  return structuredClone(completeHomepage)
}

describe('toHomepageDto', () => {
  it('maps and trims the complete WordPress payload into the stable UI DTO', () => {
    expect(toHomepageDto(completeHomepage, 'tio2-a')).toEqual({
      identity: {
        id: 'aG9tZXBhZ2U6MTAx',
        siteId: 'tio2-a',
        path: '/',
        schemaVersion: 'homepage-v0.1',
        status: 'publish',
        modified: '2026-08-23T08:30:00.000Z',
      },
      hero: {
        eyebrow: 'Industrial titanium dioxide',
        heading: 'Reliable TiO2 supply',
        summary: 'Owned production for selected grades; partner production for others.',
        primaryCta: {label: 'Request a quote', href: '#rfq'},
        secondaryCta: {label: 'Explore products', href: '/products'},
        image: {
          src: 'https://wordpress.test/wp-content/uploads/hero.webp',
          alt: 'Titanium dioxide production line',
          width: 1200,
          height: 800,
          mimeType: 'image/webp',
        },
      },
      metrics: [{value: '20', unit: 'years', label: 'Export experience', context: 'User-confirmed operating history'}],
      productDiscovery: {heading: 'Product routes', intro: 'Compare grades by end use.'},
      productRoutes: [
        {title: 'Rutile grades', summary: 'Grades for coatings and plastics.', href: '/products/rutile', image: null},
        {title: 'Anatase grades', summary: 'Grades for fibers and specialist applications.', href: '/products/anatase', image: {src: 'https://wordpress.test/wp-content/uploads/hero.webp', alt: 'Bagged anatase titanium dioxide', width: 1200, height: 800, mimeType: 'image/webp'}},
      ],
      applicationDiscovery: {heading: 'Applications', intro: 'Start with the performance target.'},
      applications: [
        {title: 'Coatings', summary: 'Opacity and weathering routes.', href: '/applications/coatings', image: null},
        {title: 'Plastics', summary: 'Dispersion and processability routes.', href: '/applications/plastics', image: null},
        {title: 'Paper', summary: 'Brightness and opacity routes.', href: '/applications/paper', image: null},
      ],
      inquiry: {
        heading: 'A clear inquiry process',
        steps: [
          {number: 1, title: 'Share requirements', description: 'Tell us the use and target properties.'},
          {number: 2, title: 'Review options', description: 'Compare technically suitable routes.'},
          {number: 3, title: 'Confirm next step', description: 'Align documentation, sample, and commercial details.'},
        ],
      },
      trust: {
        heading: 'A bounded supply claim',
        intro: 'We distinguish owned and partner production.',
        reasons: [
          {title: 'Product-specific sourcing', description: 'The route identifies owned or partner production.'},
          {title: 'Document review', description: 'Documents are matched to the offered grade.'},
          {title: 'Evidence-aware claims', description: 'Third-party claims require a source.'},
        ],
      },
      rfq: {
        heading: 'Prepare a local inquiry',
        intro: 'This local demo does not send or store your inquiry.',
        labels: {
          name: 'Name', company: 'Company', countryRegion: 'Country / Region', workEmail: 'Work email', buyerType: 'Buyer type', interest: 'Product or application interest', expectedQuantity: 'Expected quantity', destination: 'Destination', message: 'Message', privacy: 'I understand this is a local demo.', buyerIndustrial: 'Industrial buyer', buyerDistributor: 'Distributor', buyerOther: 'Other business buyer',
        },
        submitLabel: 'Review inquiry',
        privacyText: 'The local demo does not send or save this information.',
        success: {heading: 'Local review complete', message: 'Nothing was transmitted or saved.'},
      },
      faq: {
        heading: 'Frequently asked questions',
        items: [
          {question: 'Which grade should I choose?', answer: 'Start with the application and performance target.', relatedLink: {label: 'Browse rutile grades', href: '/products/rutile'}},
          {question: 'Can I request documents?', answer: 'State the grade and document needed in the inquiry.', relatedLink: null},
          {question: 'Is every product made in an owned plant?', answer: 'No. Some products use OEM or partner production.', relatedLink: null},
        ],
      },
      closingCta: {heading: 'Define the right supply route', body: 'Share the application, destination, and expected quantity.', label: 'Start local inquiry', href: '#rfq'},
      seo: {
        title: 'Titanium Dioxide Supplier | TiO2 Products',
        description: 'Compare titanium dioxide grades, applications, evidence, and supply routes.',
        ogImage: null,
        primaryTopic: 'titanium dioxide supplier',
        secondaryTopics: ['rutile titanium dioxide', 'anatase titanium dioxide'],
      },
    })
  })

  it('keeps optional images and metrics absent without inventing content', () => {
    const node = cloneHomepage()
    Reflect.set(node.homepageFields, 'heroImage', null)
    node.homepageFields.heroImageAlt = ''
    node.homepageFields.metrics = []

    expect(toHomepageDto(node, 'tio2-a')).toMatchObject({
      hero: {image: null},
      metrics: [],
      seo: {ogImage: null},
    })
  })

  it('maps the real GraphQL OG media item altText into the SEO image DTO', () => {
    const node = cloneHomepage()
    Reflect.set(node.homepageFields, 'ogImage', {
      node: {
        ...image.node,
        mediaItemUrl: 'https://wordpress.test/wp-content/uploads/homepage-og.webp',
        altText: ' Site-owned titanium dioxide facility ',
      },
    })

    expect(toHomepageDto(node, 'tio2-a').seo.ogImage).toEqual({
      src: 'https://wordpress.test/wp-content/uploads/homepage-og.webp',
      alt: 'Site-owned titanium dioxide facility',
      width: 1200,
      height: 800,
      mimeType: 'image/webp',
    })
  })

  it.each([
    ['empty', ''],
    ['null', null],
  ] as const)('accepts an optional OG image with %s GraphQL altText', (_label, altText) => {
    const node = cloneHomepage()
    Reflect.set(node.homepageFields, 'ogImage', {
      node: {...image.node, altText},
    })

    expect(toHomepageDto(node, 'tio2-a').seo.ogImage).toEqual({
      src: image.node.mediaItemUrl,
      alt: '',
      width: 1200,
      height: 800,
      mimeType: 'image/webp',
    })
  })

  it('rejects HTML in optional OG media altText', () => {
    const node = cloneHomepage()
    Reflect.set(node.homepageFields, 'ogImage', {
      node: {...image.node, altText: '<em>Unsafe OG alt</em>'},
    })

    expect(() => toHomepageDto(node, 'tio2-a')).toThrowError(
      expect.objectContaining({
        name: HomepageContractError.name,
        fieldPath: 'seo.ogImage.alt',
      }),
    )
  })

  it.each([
    [
      'Site A',
      {
        intro: 'This v0.1 local demo does not send or store inquiry data.',
        privacyText: 'This local demo does not send or save entered information.',
        successHeading: 'Local check complete',
        successMessage: 'Nothing was transmitted or saved by this Site A local demo.',
      },
    ],
    [
      'Site B',
      {
        intro: 'This v0.1 local demo does not send or store inquiry data.',
        privacyText: 'This Site B local demo does not send or save entered information.',
        successHeading: 'Site B local check complete',
        successMessage: 'No Site B information was transmitted or saved by this local demo.',
      },
    ],
    [
      'coordinated denials',
      {
        intro: 'Inquiry data is not sent or stored by this local demo.',
        privacyText: 'Entered information is not sent or saved by this local demo.',
        successHeading: 'Local check complete',
        successMessage: 'Nothing was sent, transmitted, or saved by this local demo.',
      },
    ],
    [
      'WordPress executable fixture',
      {
        intro: 'This v0.1 local demo does not send or store inquiry data.',
        privacyText: 'This local demo does not send or save the information entered.',
        successHeading: 'Local validation complete',
        successMessage: 'Nothing was sent, transmitted, or saved by this local interaction.',
      },
    ],
    [
      'DTO mock fixture',
      {
        intro: 'This local demo does not send or store your inquiry.',
        privacyText: 'The local demo does not send or save this information.',
        successHeading: 'Local review complete',
        successMessage: 'Nothing was transmitted or saved.',
      },
    ],
  ] as const)('accepts the approved local-only RFQ behavior copy for %s', (_site, copy) => {
    const node = cloneHomepage()
    node.homepageFields.rfqIntro = copy.intro
    node.homepageFields.rfqPrivacyText = copy.privacyText
    node.homepageFields.rfqSuccessHeading = copy.successHeading
    node.homepageFields.rfqSuccessMessage = copy.successMessage

    expect(toHomepageDto(node, 'tio2-a').rfq).toMatchObject({
      intro: copy.intro,
      privacyText: copy.privacyText,
      success: {
        heading: copy.successHeading,
        message: copy.successMessage,
      },
    })
  })

  it('matches approved RFQ behavior copy after case and whitespace normalization', () => {
    const node = cloneHomepage()
    node.homepageFields.rfqIntro =
      '  INQUIRY  data is NOT sent or stored by this LOCAL demo.  '
    node.homepageFields.rfqPrivacyText =
      'ENTERED information is not sent or saved by this  local demo.'
    node.homepageFields.rfqSuccessHeading = ' LOCAL  REVIEW complete '
    node.homepageFields.rfqSuccessMessage =
      'NOTHING was sent,  transmitted, or saved by this LOCAL demo.'

    expect(() => toHomepageDto(node, 'tio2-a')).not.toThrow()
  })

  it.each([
    ['rfq.intro', 'rfqIntro', 'Your inquiry was submitted and sent to our team.'],
    ['rfq.privacyText', 'rfqPrivacyText', 'Your information will be stored, saved, and processed.'],
    ['rfq.success.heading', 'rfqSuccessHeading', 'Inquiry received'],
    ['rfq.success.message', 'rfqSuccessMessage', 'Your inquiry was transmitted, forwarded, and emailed.'],
    ['rfq.intro', 'rfqIntro', 'This local demo does not send inquiry data.'],
    ['rfq.privacyText', 'rfqPrivacyText', 'This local demo does not save entered information.'],
    ['rfq.success.message', 'rfqSuccessMessage', 'No information was transmitted by this local demo.'],
    ['rfq.intro', 'rfqIntro', 'Your request was not sent but was stored locally.'],
    ['rfq.success.heading', 'rfqSuccessHeading', 'No worries, inquiry received'],
    ['rfq.intro', 'rfqIntro', 'No issue, inquiry was sent and stored.'],
    ['rfq.intro', 'rfqIntro', 'Inquiry was not sent, stored locally.'],
    ['rfq.intro', 'rfqIntro', 'No issue because inquiry was sent and stored.'],
    ['rfq.intro', 'rfqIntro', 'No issue after inquiry was sent and stored.'],
    ['rfq.intro', 'rfqIntro', 'No issue therefore inquiry was sent and stored.'],
    [
      'rfq.intro',
      'rfqIntro',
      'Inquiry data was not sent and later it was stored by this local demo.',
    ],
    ['rfq.intro', 'rfqIntro', 'Inquiry data was not sent — stored locally.'],
    ['rfq.intro', 'rfqIntro', 'No issue as inquiry was sent and stored.'],
    ['rfq.success.heading', 'rfqSuccessHeading', 'No problem — inquiry received'],
    [
      'rfq.intro',
      'rfqIntro',
      'Inquiry data is not not sent or stored by this local demo.',
    ],
    [
      'rfq.intro',
      'rfqIntro',
      'This v0.1 local demo does not send or store inquiry data. Inquiry accepted and logged.',
    ],
    ['rfq.success.heading', 'rfqSuccessHeading', 'Inquiry accepted'],
    ['rfq.success.heading', 'rfqSuccessHeading', 'Inquiry delivered'],
    ['rfq.success.heading', 'rfqSuccessHeading', 'Inquiry queued'],
    ['rfq.success.heading', 'rfqSuccessHeading', 'Inquiry recorded'],
    [
      'rfq.intro',
      'rfqIntro',
      'Approved local copy: This v0.1 local demo does not send or store inquiry data.',
    ],
    [
      'rfq.intro',
      'rfqIntro',
      'This local demo does not send or save entered information.',
    ],
    ['rfq.privacyText', 'rfqPrivacyText', '<strong>This demo does not send or save data.</strong>'],
  ] as const)(
    'rejects misleading or incomplete local-only behavior at %s',
    (fieldPath, fieldName, copy) => {
      const node = cloneHomepage()
      Reflect.set(node.homepageFields, fieldName, copy)

      expect(() => toHomepageDto(node, 'tio2-a')).toThrowError(
        expect.objectContaining({
          name: HomepageContractError.name,
          fieldPath,
        }),
      )
    },
  )

  it.each([
    ['hero.heading', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.heroHeading = '' }],
    ['hero.heading', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.heroHeading = '<b>Unsafe</b>' }],
    ['identity.modified', (node: ReturnType<typeof cloneHomepage>) => { node.modifiedGmt = '2026-02-30T08:30:00' }],
    ['metrics', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.metrics = Array(5).fill(node.homepageFields.metrics[0]) }],
    ['productRoutes', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.productRoutes = node.homepageFields.productRoutes.slice(0, 1) }],
    ['applications', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.applications = node.homepageFields.applications.slice(0, 2) }],
    ['inquiry.steps', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.inquirySteps = node.homepageFields.inquirySteps.slice(0, 2) }],
    ['trust.reasons', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.trustReasons = node.homepageFields.trustReasons.slice(0, 2) }],
    ['faq.items', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.faqs = node.homepageFields.faqs.slice(0, 2) }],
    ['seo.secondaryTopics', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.secondaryTopics = Array.from({length: 11}, (_, index) => ({secondaryTopic: `topic ${index}`})) }],
    ['productRoutes[1].href', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.productRoutes[1].productPath = node.homepageFields.productRoutes[0].productPath }],
    ['applications[1].href', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.applications[1].applicationPath = 'https://tio2hub.com/applications/plastics' }],
    ['faq.items[1].question', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.faqs[1].faqQuestion = node.homepageFields.faqs[0].faqQuestion }],
    ['seo.secondaryTopics[1]', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.secondaryTopics[1].secondaryTopic = node.homepageFields.secondaryTopics[0].secondaryTopic }],
    ['rfq.labels.workEmail', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.rfqLabels.rfqLabelWorkEmail = '' }],
    ['trust.reasons[2].evidenceUrl', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.trustReasons[2].trustReasonEvidenceUrl = '' }],
    ['metrics[0].evidenceUrl', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.metrics[0].metricClaimBasis = ['source_required']; node.homepageFields.metrics[0].metricEvidenceUrl = 'http://example.com/evidence' }],
    ['hero.image.alt', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.heroImageAlt = 'a'.repeat(161) }],
    ['productRoutes[0].imageAlt', (node: ReturnType<typeof cloneHomepage>) => { node.homepageFields.productRoutes[0].productImage = null; node.homepageFields.productRoutes[0].productImageAlt = 'No matching image' }],
  ] as const)('rejects invalid %s with a stable field path', (fieldPath, mutate) => {
    const node = cloneHomepage()
    mutate(node)

    expect(() => toHomepageDto(node, 'tio2-a')).toThrowError(
      expect.objectContaining({name: HomepageContractError.name, fieldPath}),
    )
  })

  it('rejects a homepage outside the requested site scope', () => {
    const node = cloneHomepage()
    node.siteScopes.nodes[0].slug = 'tio2-b'

    expect(() => toHomepageDto(node, 'tio2-a')).toThrow(CrossSiteContentError)
  })

  it('rejects a homepage assigned to more than one site', () => {
    const node = cloneHomepage()
    node.siteScopes.nodes.push({__typename: 'SiteScope', slug: 'tio2-b'})

    expect(() => toHomepageDto(node, 'tio2-a')).toThrow(CrossSiteContentError)
  })

  it('rejects an unsupported schema version separately', () => {
    const node = cloneHomepage()
    node.homepageFields.homepageSchemaVersion = 'homepage-v0.2'

    expect(() => toHomepageDto(node, 'tio2-a')).toThrow(HomepageVersionError)
  })

  it('rejects unpublished homepages on formal reads', () => {
    const node = cloneHomepage()
    node.status = 'draft'

    expect(() => toHomepageDto(node, 'tio2-a')).toThrowError(
      expect.objectContaining({
        name: HomepageContractError.name,
        fieldPath: 'identity.status',
      }),
    )
  })

  it('accepts only supported media MIME and positive integral dimensions', () => {
    const wrongMime = cloneHomepage()
    wrongMime.homepageFields.heroImage = {
      node: {...image.node, mimeType: 'image/svg+xml'},
    }
    expect(() => toHomepageDto(wrongMime, 'tio2-a')).toThrowError(
      expect.objectContaining({fieldPath: 'hero.image.mimeType'}),
    )

    const wrongDimensions = cloneHomepage()
    wrongDimensions.homepageFields.heroImage = {
      node: {
        ...image.node,
        mediaDetails: {width: 0, height: 800},
      },
    }
    expect(() => toHomepageDto(wrongDimensions, 'tio2-a')).toThrowError(
      expect.objectContaining({fieldPath: 'hero.image.width'}),
    )
  })
})
