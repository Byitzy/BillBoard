/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  eslint: {
    // Note: Allow warnings during builds, only stop on errors
    // 74 warnings remaining - mostly unused vars and alerts
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
