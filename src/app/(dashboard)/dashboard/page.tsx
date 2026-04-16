'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [topSkills, setTopSkills] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    }

    async function getTopSkills() {
      // Aggregate all skills_want from profiles to find top 5
      // This is a simplified client-side aggregation.
      // In production with huge scale, this should be an RPC or materialized view.
      const { data } = await supabase.from('profiles').select('skills_want');
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(p => {
          (p.skills_want || []).forEach((s: string) => {
            counts[s] = (counts[s] || 0) + 1;
          });
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
        setTopSkills(sorted);
      }
    }

    getProfile();
    getTopSkills();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-12 pb-12 animate-in fade-in duration-1000">
      
      {/* Center Action Area */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
      >
        <Link 
          href="/explore" 
          className="group relative inline-flex items-center justify-center p-1"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-xl opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative rounded-full border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl px-16 py-8 shadow-2xl transition-transform duration-300 group-hover:scale-105 active:scale-95">
            <span className="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              SKILL UP?
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Horizontal List of Top 5 Wanted Skills */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-white/40">Most Wanted Skills</p>
        <div className="flex flex-wrap justify-center gap-3">
          {topSkills.map((skill, i) => (
            <span 
              key={i} 
              className="px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm font-semibold backdrop-blur-md shadow-sm"
            >
              {skill}
            </span>
          ))}
          {topSkills.length === 0 && (
            <span className="px-4 py-2 rounded-full border border-white/10 text-slate-400 text-sm">Gathering data...</span>
          )}
        </div>
      </motion.div>
      
    </div>
  );
}
