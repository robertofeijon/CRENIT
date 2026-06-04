import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async rewrites() {
    if (!apiUrl || apiUrl.includes('localhost')) {
      return [];
    }
    return [];
  },
};

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
export default sentryDsn
  ? withSentryConfig(nextConfig, {
      silent: true,
      disableServerWebpackPlugin: !process.env.SENTRY_DSN,
      hideSourceMaps: true,
    })
  : nextConfig;
