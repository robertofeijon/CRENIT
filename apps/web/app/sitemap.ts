import type { MetadataRoute } from 'next';
import { BLOG_POSTS } from '../src/content/blog-posts';
import { getSiteUrl, MARKETING_SLUGS } from '../src/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/solutions`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/company`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/company/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/company/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/auth`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/data`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${base}/data/methodology`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const marketingPages = MARKETING_SLUGS.map((slug) => ({
    url: `${base}/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: slug.includes('privacy') || slug.includes('terms') ? 0.4 : 0.7,
  }));

  const blogPages = BLOG_POSTS.map((post) => ({
    url: `${base}/company/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...marketingPages, ...blogPages];
}
