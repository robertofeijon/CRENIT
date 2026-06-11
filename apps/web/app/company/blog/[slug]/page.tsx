import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getBlogPost } from '../../../../src/content/blog-posts';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return { title: 'Not found' };
  return { title: post.title, description: post.excerpt, openGraph: { title: post.title, description: post.excerpt } };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <main className="min-h-[80vh] bg-[#F5F5F5] py-20">
      <article className="mx-auto max-w-3xl px-6 sm:px-8">
        <Link href="/company/blog" className="text-sm font-semibold text-[#C0392B] hover:underline">
          ← All posts
        </Link>
        <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-500">
          {new Date(post.publishedAt).toLocaleDateString()} · {post.author}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-[#1A1A1A]">{post.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{post.excerpt}</p>
        <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
          {post.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="inline-flex rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#992d24]"
          >
            Get started
          </Link>
          <Link href="/company/contact" className="inline-flex rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-white">
            Contact us
          </Link>
        </div>
      </article>
    </main>
  );
}
