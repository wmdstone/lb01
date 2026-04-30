'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Post } from '../../lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react';

export function BlogPostPage({ slug }: { slug: string }) {
  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['public-post', slug],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      const match = all.find(p => p.slug === slug || p.id === slug);
      if (!match || match.status !== 'published') throw new Error('Post not found');
      return match;
    }
  });

  return (
    <div className="min-h-screen bg-base-50 font-sans pb-20">
      {/* JSON-LD Schema Placeholder */}
      {post && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "BlogPosting",
               "headline": post.title,
               "image": post.featured_image ? [post.featured_image] : [],
               "datePublished": post.published_at,
               "dateModified": post.updated_at,
               "description": post.excerpt || post.title
             })
          }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        <nav className="mb-6 md:mb-10">
          <Link href="/blog" className="inline-flex items-center text-primary font-bold hover:text-primary-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar Artikel
          </Link>
        </nav>
        
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-base-200 rounded-lg w-3/4 mb-4" />
            <div className="h-4 bg-base-200 rounded w-1/4 mb-8" />
            <div className="space-y-4">
              <div className="h-4 bg-base-200 rounded w-full" />
              <div className="h-4 bg-base-200 rounded w-full" />
              <div className="h-4 bg-base-200 rounded w-5/6" />
            </div>
          </div>
        ) : !post ? (
          <div className="text-center py-20 bg-base-0 rounded-3xl border border-border shadow-soft">
            <h2 className="text-2xl font-bold mb-2">Artikel tidak ditemukan</h2>
          </div>
        ) : (
          <article className="bg-base-0 rounded-3xl border border-border shadow-soft overflow-hidden">
            {post.featured_image && (
              <figure className="w-full h-64 md:h-96 lg:h-[480px] relative bg-base-200 m-0">
                <Image src={post.featured_image} alt={post.title} fill referrerPolicy="no-referrer" className="object-cover" />
              </figure>
            )}
            
            <div className="p-6 sm:p-8 md:p-12 lg:p-16">
              <header className="mb-10 text-center">
                 {post.category && (
                    <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary-700 text-sm font-bold rounded-full mb-6 uppercase tracking-wider">
                      {post.category}
                    </span>
                  )}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 font-serif leading-tight">
                  {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:text-base font-medium text-muted-foreground">
                  <div className="flex items-center">
                    <CalendarDays className="w-5 h-5 mr-2 text-primary" />
                    <time dateTime={post.published_at || new Date().toISOString()}>{post.published_at ? new Date(post.published_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</time>
                  </div>
                </div>
              </header>

              <section 
                className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert prose-img:mx-auto prose-img:rounded-2xl max-w-none text-foreground/90 font-serif leading-relaxed prose-headings:font-sans prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary-700 mx-auto"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
