import type {NextConfig} from 'next'

import {siteAEditorialMediaRemotePattern} from './lib/wordpress/site-a-editorial-media-policy'

const distDir = process.env.NEXT_DIST_DIR ?? '.next'
const productionBuildId = process.env.TIO2_BUILD_ID

if (distDir.includes('..') || /^[A-Za-z]:/.test(distDir) || /^[\\/]/.test(distDir)) {
  throw new Error('NEXT_DIST_DIR must be a relative path without parent traversal')
}

if (productionBuildId !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(productionBuildId)) {
  throw new Error('TIO2_BUILD_ID must be a safe non-empty Build ID')
}

const nextConfig: NextConfig = {
  distDir,
  ...(productionBuildId ? {generateBuildId: async () => productionBuildId} : {}),
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [siteAEditorialMediaRemotePattern()],
  },
}

export default nextConfig
