'use client';
import { useState, useEffect } from 'react';
import GlassUserCard from '@/components/ui/GlassUserCard';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('rating_average', { ascending: false })
        .order('sessions_completed', { ascending: false });
      
      if (!error && data) {
        // Map database fields to the component expectations
        const formatted = data.map(p => ({
          ...p,
          avatar: p.avatar_url, // GlassUserCard expects 'avatar'
          teaching: p.skills_have || [],
          learning: p.skills_want || [],
          rating: p.rating_average || 0
        }));
        setProfiles(formatted);

        // Aggregate unique skills for the right sidebar matrix
        const uniqueSkills = new Set<string>();
        data.forEach(p => {
          (p.skills_have || []).forEach((s: string) => uniqueSkills.add(s));
          (p.skills_want || []).forEach((s: string) => uniqueSkills.add(s));
        });
        setAllSkills(Array.from(uniqueSkills).sort());
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleConnect = async (receiverId: string, username: string) => {
    if (!currentUserId || currentUserId === receiverId) return;
    
    const { error } = await supabase.from('connections').insert({
      sender_id: currentUserId,
      receiver_id: receiverId,
      status: 'pending'
    });

    if (error) {
      if (error.code === '23505') alert('Connection request already sent!');
      else alert('Failed to connect: ' + error.message);
    } else {
      alert(`Connection request sent to ${username}!`);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    // Hide ourselves from the grid if we prefer, but for demo let's keep or filter
    if (p.id === currentUserId) return false;

    const matchesSearch = p.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.teaching.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.learning.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === 'All') return matchesSearch;
    return matchesSearch && (p.teaching.includes(activeTab) || p.learning.includes(activeTab));
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12 w-full animate-in fade-in duration-500">
      
      {/* Main Grid Area */}
      <div className="flex-1 order-2 lg:order-1">
        <header className="mb-8">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search for skills, users... e.g. React, UX Design" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[2rem] border border-white/10 dark:border-white/20 bg-white/40 dark:bg-white/5 px-8 py-5 text-lg text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500 transition-all font-light"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-indigo-600 px-6 py-2.5 font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg active:scale-95">
              Search
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full place-items-stretch">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 rounded-[2rem] bg-slate-200 dark:bg-white/5 animate-pulse border border-slate-300 dark:border-white/10" />
            ))
          ) : (
            <AnimatePresence>
              {filteredProfiles.map((u, i) => (
                <motion.div 
                  key={u.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassUserCard 
                    user={u} 
                    onConnect={() => handleConnect(u.id, u.username)} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {!loading && filteredProfiles.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-500 dark:text-white/30 text-xl font-medium">No peers found matching your filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar Filters */}
      <aside className="w-full lg:w-80 order-1 lg:order-2 shrink-0">
        <div className="sticky top-32 rounded-[2rem] border border-white/20 bg-white/40 dark:bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white tracking-wide">Filter Matrix</h2>
          
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50 mb-3">Unique Skills</p>
              <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto no-scrollbar pb-4 pr-2">
                <button 
                  onClick={() => setActiveTab('All')}
                  className={`text-left px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'All' 
                      ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                      : 'text-slate-600 dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10 border border-transparent dark:border-white/5'
                  }`}
                >
                  All Skills
                </button>
                {allSkills.map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-left px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                      activeTab === tab 
                        ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                        : 'text-slate-600 dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/10 border border-slate-300 dark:border-white/5'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}
