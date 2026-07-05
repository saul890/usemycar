// next.config.ts — Next.js configuration.
// The main thing we add here is permission to load images from Supabase Storage.
// Without this, Next.js would block <Image> tags pointing at external domains.
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
