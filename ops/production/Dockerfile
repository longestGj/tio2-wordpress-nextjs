# syntax=docker/dockerfile:1.10.0
FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder

WORKDIR /app

ARG SITE_ID=tio2-my
ARG NODE_ENV=production
ARG VERCEL_ENV=production
ARG NEXT_PUBLIC_SITE_URL=https://tio2malaysia.com
ARG NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT=production
ARG NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY
ARG TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=false
ARG WORDPRESS_GRAPHQL_URL=http://wordpress/graphql
ARG WORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com
ARG WORDPRESS_PREVIEW_URL=http://wordpress/wp-json/tio2/v1/preview
ARG TIO2_BUILD_ID

ENV SITE_ID=${SITE_ID} \
    NODE_ENV=${NODE_ENV} \
    VERCEL_ENV=${VERCEL_ENV} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT=${NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT} \
    NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=${NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY} \
    TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=${TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED} \
    WORDPRESS_GRAPHQL_URL=${WORDPRESS_GRAPHQL_URL} \
    WORDPRESS_MEDIA_ORIGIN=${WORDPRESS_MEDIA_ORIGIN} \
    WORDPRESS_PREVIEW_URL=${WORDPRESS_PREVIEW_URL} \
    TIO2_BUILD_ID=${TIO2_BUILD_ID}

COPY . .
RUN --mount=type=tmpfs,target=/app/.next/cache --mount=type=secret,id=wordpress_editorial_api_token,env=WORDPRESS_EDITORIAL_API_TOKEN,required=true npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN groupadd --system nodejs && useradd --system --gid nodejs --create-home nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["sh", "-ec", "export REVALIDATION_SECRET=\"$NEXTJS_REVALIDATION_SECRET_TIO2_MY\" WORDPRESS_PREVIEW_SECRET=\"$NEXTJS_PREVIEW_SECRET_TIO2_MY\"; exec npm run start -- --hostname 0.0.0.0 --port 3000"]
