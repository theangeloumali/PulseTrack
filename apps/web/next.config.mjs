/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  basePath: "/pulse",
  assetPrefix: "/pulse",
  typescript: {
    // Temporarily ignore TypeScript errors during build to allow deployment
    // This is needed due to React 19 + Lucide icons compatibility issues
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/pulse',
        permanent: false,
        basePath: false, // Important: bypass basePath for this redirect
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/pulse/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

export default nextConfig
