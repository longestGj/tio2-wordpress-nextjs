import type {CodegenConfig} from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema:
    process.env.WORDPRESS_GRAPHQL_URL ?? 'http://localhost:8080/graphql',
  documents: ['lib/wordpress/queries.ts'],
  generates: {
    'lib/wordpress/generated.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        immutableTypes: true,
        useTypeImports: true,
      },
    },
  },
}

export default config
