/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["better-auth"]
  },
  env:{
    DATABASE_URL: process.env.DATABASE_URL
  }
}

module.exports = nextConfig
