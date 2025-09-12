/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Temporarily disabled to reduce Fast Refresh rebuilds
  typedRoutes: true,
  eslint: {
    // Note: Allow warnings during builds, only stop on errors
    // 74 warnings remaining - mostly unused vars and alerts
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aytzgpwkjmdgznxxtrdd.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      'recharts',
    ],
    // Enable concurrent features for better performance
    ppr: false, // Partial prerendering - disabled for now
    // Reduce memory usage
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
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
      // Improve dev build speed and reduce memory usage
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
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
          // Separate chunk for performance-heavy components
          performance: {
            chunks: 'all',
            name: 'performance',
            test: /[\\/]node_modules[\\/](@tanstack|framer-motion)[\\/]/,
            priority: 30,
            enforce: true,
          },
        },
      };
      
      // Reduce bundle analysis overhead in dev
      config.optimization.providedExports = false;
      config.optimization.usedExports = false;
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
