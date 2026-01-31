/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Enable standalone output for Docker deployment
  output: 'standalone',
}

module.exports = nextConfig
