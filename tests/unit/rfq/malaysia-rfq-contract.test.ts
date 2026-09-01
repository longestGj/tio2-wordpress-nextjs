import {describe, expect, it} from 'vitest'

import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'

describe('CONV-RFQ approved contract', () => {
  it('freezes page identity, copy, option order and external-owner routes', () => {
    expect(contract.identity).toEqual({
      pageId: 'CONV-RFQ',
      siteScope: 'tio2-my',
      locale: 'en',
      path: '/request-a-quote/',
      schemaVersion: 'rfq-page-v0.1-malaysia',
    })
    expect(contract.hero).toEqual({
      eyebrow: 'B2B QUOTATION REQUEST',
      h1: 'Request a Titanium Dioxide Quote',
      body: 'Tell us the product, application, quantity and destination you are evaluating. Our team will review your requirements and prepare the appropriate commercial response.',
    })
    expect(contract.form.gradeOptions).toEqual([
      'M-350', 'M-510', 'M-896', 'M-996', 'M-2196', 'M-895', 'M-200',
      'M-108', 'M-210', 'M-340', 'M-886', 'M-52', 'M-2377', 'CR-901',
      'Not sure / Need help',
    ])
    expect(contract.form.applicationOptions).toEqual([
      'Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper',
      'Specialty Materials', 'Other / Not sure',
    ])
    expect(contract.form.fields).toHaveLength(12)
    expect(Object.keys(contract.form.errors)).toHaveLength(15)
    expect(contract.routes).toMatchObject({
      sample: {label: 'Request a Sample', href: '/request-sample/'},
      documents: {label: 'Request Documents', href: '/request-documents/'},
      privacy: {label: 'Privacy Policy', href: null},
    })
  })

  it('keeps metadata and Schema inside the approved boundary', () => {
    expect(contract.seo).toMatchObject({
      title: 'Request a Titanium Dioxide Quote | TiO2 Malaysia',
      canonical: 'https://tio2malaysia.com/request-a-quote/',
      language: 'en',
    })
    expect(contract.schema.allowedTypes).toEqual(['WebPage', 'BreadcrumbList'])
    expect(JSON.stringify(contract.schema)).not.toMatch(/FAQPage|QAPage|Product|Offer|AggregateOffer/u)
    expect(contract.releaseControls).toMatchObject({
      remarketingEnabled: false,
      turnstileEnabled: false,
      recaptchaEnabled: false,
    })
  })
})
