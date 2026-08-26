import type {NextConfig} from 'next'

import {siteAEditorialMediaRemotePattern} from './lib/wordpress/site-a-editorial-media-policy'

const distDir = process.env.NEXT_DIST_DIR ?? '.next'

if (distDir.includes('..') || /^[A-Za-z]:/.test(distDir) || /^[\\/]/.test(distDir)) {
  throw new Error('NEXT_DIST_DIR must be a relative path without parent traversal')
}

const nextConfig: NextConfig = {
  distDir,
  images: {
    remotePatterns: [siteAEditorialMediaRemotePattern()],
  },
}

export default nextConfig
