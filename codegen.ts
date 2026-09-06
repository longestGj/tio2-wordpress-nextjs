import type {CodegenConfig} from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'wordpress/schema.graphql',
  documents: [
    'lib/wordpress/queries.graphql',
    'lib/wordpress/homepage*-queries.graphql',
    'lib/wordpress/market-hub*-queries.graphql',
    'lib/wordpress/market-page*-queries.graphql',
    'lib/wordpress/product-hub*-queries.graphql',
    'lib/wordpress/product-detail*-queries.graphql',
    'lib/wordpress/resource-hub*-queries.graphql',
    'lib/wordpress/resource-origin*-queries.graphql',
    'lib/wordpress/resource-proc*-queries.graphql',
    'lib/wordpress/documents-hub*-queries.graphql',
    'lib/wordpress/document-tds*-queries.graphql',
    'lib/wordpress/document-reach*-queries.graphql',
    'lib/wordpress/request-documents*-queries.graphql',
    'lib/wordpress/request-sample*-queries.graphql',
    'lib/wordpress/legal-pages*-queries.graphql',
    'lib/wordpress/about-page*-queries.graphql',
    'lib/wordpress/product-queries.graphql',
    'lib/wordpress/product-page-queries.graphql',
    'lib/wordpress/application-queries.graphql',
    'lib/wordpress/resource-queries.graphql',
  ],
  generates: {
    'lib/wordpress/generated.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typed-document-node',
      ],
      config: {
        enumsAsTypes: true,
        immutableTypes: true,
        onlyOperationTypes: true,
        preResolveTypes: true,
        useTypeImports: true,
      },
    },
  },
}

export default config
