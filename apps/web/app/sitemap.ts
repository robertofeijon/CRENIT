import type { MetadataRoute } from 'next';
import { getSiteUrl, MARKETING_SLUGS } from '../src/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/solutions`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/company`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/auth`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const marketingPages = MARKETING_SLUGS.map((slug) => ({
    url: `${base}/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: slug.includes('privacy') || slug.includes('terms') ? 0.4 : 0.7,
  }));

  return [...staticRoutes, ...marketingPages];
}
