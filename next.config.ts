import type {NextConfig} from 'next'

const distDir = process.env.NEXT_DIST_DIR ?? '.next'

if (distDir.includes('..') || /^[A-Za-z]:/.test(distDir) || /^[\\/]/.test(distDir)) {
  throw new Error('NEXT_DIST_DIR must be a relative path without parent traversal')
}

const nextConfig: NextConfig = {
  distDir,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tio2products.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
