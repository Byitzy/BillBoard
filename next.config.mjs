/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  eslint: {
    // Note: Temporarily ignoring ESLint during builds for production deployment
    // TODO: Address remaining ESLint warnings (unused vars, alerts, import order)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
