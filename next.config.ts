
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/hca-logo-192.png',
        destination: '/api/logo?size=192',
      },
      {
        source: '/hca-logo-512.png',
        destination: '/api/logo?size=512',
      },
    ]
  },
};

export default nextConfig;
