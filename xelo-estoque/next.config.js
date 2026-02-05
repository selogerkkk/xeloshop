/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  }
}

module.exports = nextConfig
