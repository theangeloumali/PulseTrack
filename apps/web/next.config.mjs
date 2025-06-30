/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  basePath: "/pulse",
  assetPrefix: "/pulse",
}

export default nextConfig
