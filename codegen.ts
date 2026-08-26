import type {CodegenConfig} from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'wordpress/schema.graphql',
  documents: [
    'lib/wordpress/queries.graphql',
    'lib/wordpress/homepage*-queries.graphql',
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
