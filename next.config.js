/** @type {import('next').NextConfig} */
const nextConfig = {
  // Long Notion posts embed a large `recordMap` in __NEXT_DATA__; raise warning threshold only.
  experimental: {
    largePageDataBytes: 12 * 1024 * 1024,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.notion.so',
      },
      // Notion-hosted static assets / files
      {
        protocol: 'https',
        hostname: 'notion.so',
      },
      {
        protocol: 'https',
        hostname: 'secure.notion-static.com',
      },
      {
        protocol: 'https',
        hostname: 'file.notion.so',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 's3-us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
      },
    ],
  },
}

module.exports = nextConfig
