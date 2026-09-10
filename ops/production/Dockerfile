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
ARG WORDPRESS_GRAPHQL_URL=http://wordpress/graphql
ARG WORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com
ARG WORDPRESS_PREVIEW_URL=https://cms.tio2malaysia.com/wp-json/tio2/v1/preview

ENV SITE_ID=${SITE_ID} \
    NODE_ENV=${NODE_ENV} \
    VERCEL_ENV=${VERCEL_ENV} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    WORDPRESS_GRAPHQL_URL=${WORDPRESS_GRAPHQL_URL} \
    WORDPRESS_MEDIA_ORIGIN=${WORDPRESS_MEDIA_ORIGIN} \
    WORDPRESS_PREVIEW_URL=${WORDPRESS_PREVIEW_URL}

COPY . .
RUN npm run build
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

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
