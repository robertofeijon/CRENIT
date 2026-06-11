import type { MetadataRoute } from 'next';
import { getSiteUrl } from '../src/lib/site';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/tenant/', '/landlord/', '/auth/verify-2fa', '/join/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
