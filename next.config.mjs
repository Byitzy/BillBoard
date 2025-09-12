/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Temporarily disabled to reduce Fast Refresh rebuilds
  typedRoutes: true,
  eslint: {
    // Note: Allow warnings during builds, only stop on errors
    // 74 warnings remaining - mostly unused vars and alerts
    ignoreDuringBuilds: false,
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      'recharts',
    ],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Improve dev build speed
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
        },
      };
    }

    // Production optimizations
    if (!dev) {
      // Enable bundle analyzer in production
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 10,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };

      // Reduce bundle size
      config.resolve.alias = {
        ...config.resolve.alias,
        // Add aliases for heavy components that can be lazy loaded
      };
    }

    return config;
  },
};

export default nextConfig;
