import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Post } from '../../lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

export function BlogListPage() {
  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      return all.filter(p => p.status === 'published');
    }
  });

  return (
    <div className="min-h-screen bg-base-50 font-sans pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-12">
        <nav className="mb-6 md:mb-10">
          <Link href="/" className="inline-flex items-center text-primary font-bold hover:text-primary-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Beranda
          </Link>
        </nav>
        
        <header className="mb-10 md:mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-4 font-serif tracking-tight">PPMH Insight</h1>
          <p className="text-lg md:text-xl text-muted-foreground flex-1">Kumpulan artikel, berita, dan inspirasi dari Pondok Pesantren Miftahul Huda.</p>
        </header>

        {isLoading ? (
          <section className="space-y-6 animate-pulse">
            {[1,2,3].map(i => (
              <article key={i} className="h-64 bg-base-200 rounded-3xl w-full" />
            ))}
          </section>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-8">
            {posts.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-base-0 rounded-3xl border border-border">
                <p>Belum ada artikel yang diterbitkan.</p>
              </div>
            )}
            
            {posts.map((post) => (
              <article key={post.id} className="group bg-base-0 rounded-3xl border border-border shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col overflow-hidden">
                <Link href={`/blog/${post.slug || post.id}`} className="block overflow-hidden relative">
                  {post.featured_image ? (
                    <div className="w-full h-48 sm:h-56 bg-base-200 relative">
                      <Image src={post.featured_image} alt={post.title} fill referrerPolicy="no-referrer" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="w-full h-48 sm:h-56 bg-primary/5 flex items-center justify-center relative">
                      <span className="text-primary/30 font-serif font-black text-4xl">PPMH</span>
                    </div>
                  )}
                </Link>
                <div className="p-6 md:p-8 flex flex-col flex-1">
                  <header>
                    {post.category && (
                      <span className="inline-block px-3 py-1 bg-primary/10 text-primary-700 text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                        {post.category}
                      </span>
                    )}
                    <h2 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2 md:line-clamp-3 leading-snug">
                      <Link href={`/blog/${post.slug || post.id}`}>
                        {post.title}
                      </Link>
                    </h2>
                  </header>
                  
                  {post.excerpt && (
                    <p className="text-muted-foreground text-sm md:text-base line-clamp-3 mb-6 flex-1">
                      {post.excerpt}
                    </p>
                  )}
                  
                  <footer className="mt-auto pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center text-xs font-semibold text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1.5 text-primary" />
                      <time dateTime={post.published_at || new Date().toISOString()}>{post.published_at ? new Date(post.published_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</time>
                    </div>
                    
                    <Button variant="ghost" className="w-full sm:w-auto font-bold text-primary hover:text-primary-700 hover:bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300" asChild>
                      <Link href={`/blog/${post.slug || post.id}`}>
                        Baca Selengkapnya
                        <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </footer>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
