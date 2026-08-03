/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' }
    ],
    formats: ['image/avif', 'image/webp']
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion']
  }
};

export default nextConfig;
