'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { Post, Student } from '../../lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Trophy, BookOpen, Clock, Activity, Users } from 'lucide-react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export function LandingPage() {
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const res = await apiFetch('/api/posts');
      if (!res.ok) throw new Error('Failed to fetch posts');
      const all: Post[] = await res.json();
      return all.filter(p => p.status === 'published').slice(0, 3);
    }
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['public-students'],
    queryFn: async () => {
      const res = await apiFetch('/api/students');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

  const topStudents = [...students].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 3);

  // Mock data for trends
  const trendData = [
    { name: 'Sen', aktif: 40, baru: 24 },
    { name: 'Sel', aktif: 30, baru: 13 },
    { name: 'Rab', aktif: 20, baru: 58 },
    { name: 'Kam', aktif: 27, baru: 39 },
    { name: 'Jum', aktif: 18, baru: 48 },
    { name: 'Sab', aktif: 23, baru: 38 },
    { name: 'Min', aktif: 34, baru: 43 },
  ];

  return (
    <div className="min-h-screen bg-base-50 font-sans pb-20">
      {/* Hero Section */}
      <section className="bg-primary/5 border-b border-primary/10 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-24 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary-700 text-sm font-bold mb-6">
              <Activity className="w-4 h-4" /> Sistem Informasi Terpadu
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 font-serif tracking-tight leading-tight">
              PPMH <span className="text-primary block md:inline">Insight</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Platform pusat data, pencapaian santri, dan berita terkini Pondok Pesantren Miftahul Huda. Membangun generasi unggul melalui keterbukaan informasi.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/leaderboard" className="px-8 py-4 rounded-xl bg-primary text-white font-bold shadow-primary-glow hover:-translate-y-1 transition-transform w-full sm:w-auto text-center inline-flex justify-center items-center">
                <Trophy className="w-5 h-5 mr-2" /> Lihat Leaderboard
              </Link>
              <Link href="/blog" className="px-8 py-4 rounded-xl bg-base-0 text-foreground border border-border font-bold hover:bg-base-50 transition-colors w-full sm:w-auto text-center inline-flex justify-center items-center">
                <BookOpen className="w-5 h-5 mr-2" /> Baca Artikel
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats & Trends Section */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={{
          visible: { transition: { staggerChildren: 0.2 } },
          hidden: {}
        }}
        className="max-w-6xl mx-auto px-4 md:px-8 py-16 -mt-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Students Podium */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } }
            }}
            className="lg:col-span-1 bg-base-0 p-8 rounded-3xl border border-border shadow-soft relative overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" /> Top Santri
              </h2>
              <Link href="/leaderboard" className="text-primary text-sm font-bold hover:underline">
                Lihat Semua
              </Link>
            </div>
            
            <div className="space-y-4">
              {topStudents.map((student, i) => (
                <div key={student.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-base-50 transition-colors border border-transparent hover:border-border">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0 ${
                    i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-600'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.bio || 'Santri PPMH'}</p>
                  </div>
                  <div className="font-black text-primary">
                    {student.totalPoints || 0} pt
                  </div>
                </div>
              ))}
              {topStudents.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">Belum ada data santri.</p>
              )}
            </div>
          </motion.div>

          {/* Activity Trend Chart */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } }
            }}
            className="lg:col-span-2 bg-base-0 p-8 rounded-3xl border border-border shadow-soft"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" /> Tren Aktivitas
              </h2>
              <span className="text-sm font-medium text-muted-foreground bg-base-100 px-3 py-1 rounded-full">
                7 Hari Terakhir
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAktif" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                  <CartesianGrid vertical={false} stroke="#eee" />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="aktif" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAktif)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Latest News Section */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{
          visible: { transition: { staggerChildren: 0.1 } },
          hidden: {}
        }}
        className="max-w-6xl mx-auto px-4 md:px-8 py-16"
      >
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-secondary-700 text-sm font-bold mb-4">
              <BookOpen className="w-4 h-4" /> Berita Terkini
            </span>
            <h2 className="text-4xl font-black font-serif text-foreground">Sekilas PPMH</h2>
          </div>
          <Link href="/blog" className="inline-flex items-center text-primary font-bold hover:text-primary-700 transition-colors">
            Lihat Semua Artikel <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50 } }
              }}
            >
              <Link href={`/blog/${post.slug || post.id}`} className="group block h-full bg-base-0 rounded-3xl border border-border shadow-soft overflow-hidden hover:shadow-hover transition-all duration-300 flex flex-col">
                {post.featured_image ? (
                  <div className="w-full h-48 bg-base-200 overflow-hidden relative shrink-0">
                    <Image src={post.featured_image} alt={post.title} fill referrerPolicy="no-referrer" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-primary/5 flex items-center justify-center shrink-0">
                    <BookOpen className="w-12 h-12 text-primary/20" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  {post.category && (
                    <span className="inline-block w-fit px-3 py-1 bg-base-100 text-muted-foreground text-xs font-bold rounded-full mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {post.category}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                    {post.excerpt || 'Klik untuk membaca selengkapnya...'}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground font-medium mt-auto pt-4 border-t border-border">
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          {posts.length === 0 && (
            <div className="col-span-3 text-center py-20 bg-base-0 border border-dashed border-border rounded-3xl">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Belum ada artikel yang diterbitkan.</p>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
