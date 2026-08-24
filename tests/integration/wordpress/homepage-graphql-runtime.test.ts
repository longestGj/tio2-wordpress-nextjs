import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import {HOMEPAGE_RFQ_COPY_CONTRACTS} from '@/lib/wordpress/homepage-rfq-copy'
import type {SiteId} from '@/sites'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_HOMEPAGE_GRAPHQL_RUNTIME === '1'
const controlledFields = [
  ['rfqIntro', 'rfq.intro'],
  ['rfqPrivacyText', 'rfq.privacyText'],
  ['rfqSuccessHeading', 'rfq.success.heading'],
  ['rfqSuccessMessage', 'rfq.success.message'],
] as const

function liveHomepage(siteId: SiteId) {
  const query = `
    query HomepageRfqRuntime($slug: ID!) {
      tio2Homepage(id: $slug, idType: SLUG) {
        id
        databaseId
        modifiedGmt
        status
        siteScopes { nodes { slug } }
        homepageFields {
          homepageSchemaVersion: schemaVersion
          heroEyebrow
          heroHeading
          heroSummary
          heroPrimaryLabel
          heroSecondaryLabel
          heroSecondaryPath
          heroImage { node { mediaItemUrl altText mediaDetails { width height } mimeType } }
          heroImageAlt
          metrics { metricValue metricUnit metricLabel metricContext metricClaimBasis metricEvidenceUrl }
          productsHeading
          productsIntro
          productRoutes { productTitle productSummary productPath productImage { node { mediaItemUrl altText mediaDetails { width height } mimeType } } productImageAlt }
          applicationsHeading
          applicationsIntro
          applications { applicationName applicationSummary applicationPath applicationImage { node { mediaItemUrl altText mediaDetails { width height } mimeType } } applicationImageAlt }
          inquiryHeading
          inquirySteps { inquiryStepTitle inquiryStepDescription }
          trustHeading
          trustIntro
          trustReasons { trustReasonTitle trustReasonDescription trustReasonClaimBasis trustReasonEvidenceUrl }
          rfqHeading
          rfqIntro
          rfqLabels { rfqLabelName rfqLabelCompany rfqLabelCountryRegion rfqLabelWorkEmail rfqLabelBuyerType rfqLabelInterest rfqLabelExpectedQuantity rfqLabelDestination rfqLabelMessage rfqLabelPrivacy rfqBuyerIndustrialLabel rfqBuyerDistributorLabel rfqBuyerOtherLabel }
          rfqSubmitLabel
          rfqPrivacyText
          rfqSuccessHeading
          rfqSuccessMessage
          faqHeading
          faqs { faqQuestion faqAnswer faqRelatedLabel faqRelatedPath }
          closingHeading
          closingBody
          closingLabel
          seoTitle
          seoDescription
          ogImage { node { mediaItemUrl altText mediaDetails { width height } mimeType } }
          primaryTopic
          secondaryTopics { secondaryTopic }
        }
      }
    }
  `
  const response = spawnSync(
    'curl.exe',
    [
      '--noproxy',
      '*',
      '--silent',
      '--show-error',
      '--fail-with-body',
      '--header',
      'content-type: application/json',
      '--data',
      JSON.stringify({query, variables: {slug: `${siteId}--homepage`}}),
      'http://127.0.0.1:8080/graphql',
    ],
    {cwd: repositoryRoot, encoding: 'utf8', timeout: 30_000},
  )
  expect(response.error).toBeUndefined()
  expect(response.status, response.stderr || response.stdout).toBe(0)
  const body = JSON.parse(response.stdout) as {
    data?: {tio2Homepage?: Record<string, unknown>}
    errors?: unknown[]
  }
  expect(body.errors).toBeUndefined()
  expect(body.data?.tio2Homepage).toBeDefined()
  return body.data!.tio2Homepage!
}

describe.runIf(runLiveWordPress)('live Homepage controlled-select GraphQL boundary', () => {
  it.each(['tio2-a', 'tio2-b'] as const)(
    'maps the exact single-value %s lists into string DTO output',
    (siteId) => {
      const node = liveHomepage(siteId)
      const fields = node.homepageFields as Record<string, unknown>
      const contract = HOMEPAGE_RFQ_COPY_CONTRACTS[siteId]

      for (const [graphqlName, contractName] of controlledFields) {
        expect(fields[graphqlName]).toEqual([contract.fields[contractName][0]])
      }

      const homepage = toHomepageDto(node as never, siteId, {
        linkPolicy: getHomepageLinkPolicy(siteId),
      })
      expect(homepage.rfq).toMatchObject({
        intro: contract.fields['rfq.intro'][0],
        privacyText: contract.fields['rfq.privacyText'][0],
        success: {
          heading: contract.fields['rfq.success.heading'][0],
          message: contract.fields['rfq.success.message'][0],
        },
      })
    },
  )
})
