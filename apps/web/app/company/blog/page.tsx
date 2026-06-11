import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '../../../src/content/blog-posts';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Product updates, rental credit insights, and market intelligence news from CRENIT.',
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <main className="min-h-[80vh] bg-[#F5F5F5] py-20">
      <div className="mx-auto max-w-4xl px-6 sm:px-8">
        <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Blog</p>
        <h1 className="mt-4 text-4xl font-semibold text-[#1A1A1A]">Insights from the rent credit ecosystem</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Product news, market commentary, and partner stories from the CRENIT team.
        </p>
        <ul className="mt-10 space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#C0392B]/30">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {new Date(post.publishedAt).toLocaleDateString()} · {post.author}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1A1A1A]">
                  <Link href={`/company/blog/${post.slug}`} className="hover:text-[#C0392B]">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/company/blog/${post.slug}`} className="mt-4 inline-block text-sm font-semibold text-[#C0392B]">
                  Read article →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
