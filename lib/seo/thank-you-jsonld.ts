import {serializeJsonLd, type JsonLdObject} from './jsonld'

export function buildMalaysiaThankYouJsonLd(): JsonLdObject {
  const canonical = 'https://tio2malaysia.com/thank-you/'
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: 'Thank You | TiO2 Malaysia',
    description: 'View confirmation and next steps for a TiO2 Malaysia quotation, document or sample request, or choose the request you would like to make.',
    inLanguage: 'en',
    isPartOf: {'@id': 'https://tio2malaysia.com/#website'},
  }
}

export function serializeMalaysiaThankYouJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
