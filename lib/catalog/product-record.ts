import {parse} from 'yaml'
import {z} from 'zod'

const productIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const specificationUnitSchema = z.enum([
  'percent',
  'cie-l-star',
  'cie-b-star',
  'grams-per-cubic-centimeter',
  'ph',
  'cbu',
  'grams-per-100-grams',
  'micrometre',
])

const productRecordSchema = z
  .object({
    schema_version: z.literal(1),
    product: z
      .object({
        id: productIdSchema,
        brand: z.string().trim().min(1),
        model: z.string().trim().min(1),
        source_model: z.string().trim().min(1),
        family: productIdSchema,
      })
      .strict(),
    source_documents: z
      .array(
        z
          .object({
            id: productIdSchema,
            filename: z.string().regex(/^[^/\\]+\.pdf$/i),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            issuer: z.string().trim().min(1),
          })
          .strict(),
      )
      .min(1),
    specifications: z.array(
      z
        .object({
          key: productIdSchema,
          label: z.string().trim().min(1),
          value: z.number().finite(),
          unit: specificationUnitSchema,
          source_document_id: productIdSchema,
        })
        .strict(),
    ),
    claims: z.array(
      z
        .object({
          key: productIdSchema,
          text: z.string().trim().min(1),
          kind: z.enum(['source_fact', 'tiovar_copy']),
          verification: z.enum(['source_confirmed', 'unverified']),
          source_document_id: productIdSchema.optional(),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((record, context) => {
    const sourceIds = new Set(record.source_documents.map(({id}) => id))
    const specificationKeys = new Set<string>()

    record.specifications.forEach((specification, index) => {
      if (specificationKeys.has(specification.key)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate specification key: ${specification.key}`,
          path: ['specifications', index, 'key'],
        })
      }
      specificationKeys.add(specification.key)

      if (!sourceIds.has(specification.source_document_id)) {
        context.addIssue({
          code: 'custom',
          message: `Unknown source document: ${specification.source_document_id}`,
          path: ['specifications', index, 'source_document_id'],
        })
      }
    })

    record.claims.forEach((claim, index) => {
      if (claim.kind === 'source_fact' && claim.source_document_id === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'A source fact must cite a source document',
          path: ['claims', index, 'source_document_id'],
        })
      }

      if (claim.kind === 'source_fact' && claim.verification !== 'source_confirmed') {
        context.addIssue({
          code: 'custom',
          message: 'A source fact must be source-confirmed',
          path: ['claims', index, 'verification'],
        })
      }

      if (
        claim.source_document_id !== undefined &&
        !sourceIds.has(claim.source_document_id)
      ) {
        context.addIssue({
          code: 'custom',
          message: `Unknown source document: ${claim.source_document_id}`,
          path: ['claims', index, 'source_document_id'],
        })
      }
    })
  })

export type ProductRecord = z.infer<typeof productRecordSchema>

export function parseProductRecordYaml(source: string): ProductRecord {
  return productRecordSchema.parse(parse(source))
}

export function createProductRecordIndex(
  records: readonly ProductRecord[],
): ReadonlyMap<string, ProductRecord> {
  const index = new Map<string, ProductRecord>()

  for (const record of records) {
    if (index.has(record.product.id)) {
      throw new Error(`Duplicate product ID: ${record.product.id}`)
    }
    index.set(record.product.id, record)
  }

  return index
}
