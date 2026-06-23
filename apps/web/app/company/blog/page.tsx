import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MarketingPageHero from '../../components/marketing/MarketingPageHero';
import MarketingSectionReveal from '../../components/marketing/MarketingSectionReveal';
import { BLOG_POSTS } from '../../../src/content/blog-posts';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Product updates, rental credit insights, and market intelligence news from CRENIT.',
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const [featured, ...rest] = posts;

  return (
    <main>
      <MarketingPageHero
        eyebrow="Blog"
        title={
          <>
            Insights from the <em>rent credit</em> ecosystem
          </>
        }
        lead="Product news, market commentary, and partner stories from the CRENIT team in Windhoek."
      />

      <section className="marketing-section">
        <div className="marketing-container max-w-4xl">
          {featured ? (
            <MarketingSectionReveal>
              <article className="marketing-blog-featured">
                <div className="relative z-[1]">
                  <p className="marketing-eyebrow">Featured</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wider text-[var(--rc-text-muted)]">
                    {new Date(featured.publishedAt).toLocaleDateString('en-NA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    · {featured.author}
                  </p>
                  <h2 className="marketing-h2-display mt-4">
                    <Link href={`/company/blog/${featured.slug}`} className="transition hover:text-[#C0392B]">
                      {featured.title}
                    </Link>
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-[var(--rc-text-secondary)]">{featured.excerpt}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {featured.tags.map((tag) => (
                      <span key={tag} className="marketing-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/company/blog/${featured.slug}`}
                    className="marketing-btn-primary mt-8 inline-flex gap-2"
                  >
                    Read featured article
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
                <div className="relative z-[1] mt-8 hidden lg:block">
                  <div className="marketing-spotlight__card h-full min-h-[180px]">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From the article</p>
                    <p className="mt-4 text-lg font-medium leading-8 text-white/90">{featured.body[0]}</p>
                  </div>
                </div>
              </article>
            </MarketingSectionReveal>
          ) : null}

          <ul className="mt-10 space-y-5">
            {rest.map((post, index) => (
              <li key={post.slug}>
                <MarketingSectionReveal delay={index * 60}>
                  <article className="marketing-blog-card group">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--rc-text-muted)]">
                      {new Date(post.publishedAt).toLocaleDateString()} · {post.author}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--rc-text)]">
                      <Link href={`/company/blog/${post.slug}`} className="transition group-hover:text-[#C0392B]">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--rc-text-secondary)]">{post.excerpt}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="marketing-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/company/blog/${post.slug}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C0392B]"
                    >
                      Read article
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </article>
                </MarketingSectionReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
