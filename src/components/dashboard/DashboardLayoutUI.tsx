'use client';
import { useTheme } from "next-themes";
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ChatSidebar from '@/components/chat/ChatSidebar';
import LiveSessionController from '@/components/live/LiveSessionController';

// The profile box (top right)
function ProfileBox() {
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
    load();
  }, []);

  return (
    <Link href={profile ? `/profile` : '#'}>
      <motion.div 
         initial={{ opacity: 0, x: 20 }} 
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: 0.1 }}
         className="absolute top-6 right-6 z-50 flex items-center gap-3 rounded-full border border-white/10 dark:border-white/20 bg-white/50 dark:bg-black/40 backdrop-blur-3xl shadow-lg hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer p-1.5 pr-5"
      >
        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-black/10 dark:border-white/20 bg-indigo-500/20 flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-xs uppercase">{profile?.username?.charAt(0) || 'U'}</span>
          )}
        </div>
        <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-white/90">
          @{profile?.username || 'user'}
        </span>
        
        <div className="h-4 w-px bg-slate-400 dark:bg-white/20 mx-1" />
        
        <span className="text-sm font-bold text-amber-500 dark:text-amber-400 drop-shadow-md flex items-center gap-1.5">
          {profile?.rating_average ?? '5.0'} ⭐
        </span>
      </motion.div>
    </Link>
  );
}

// The Inbox (Right Side)
function InboxOverlay() {
  const [requests, setRequests] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Step 1: Get the user ID once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Step 2: Fetch pending requests when userId is available
  useEffect(() => {
    if (!userId) return;

    async function fetchPending() {
      const { data } = await supabase
        .from('connections')
        .select('id, sender_id, profiles!connections_sender_id_fkey(username, avatar_url, rating_average)')
        .eq('receiver_id', userId)
        .eq('status', 'pending');
      if (data) setRequests(data);
    }
    fetchPending();
  }, [userId]);

  // Step 3: Realtime subscription — .on() BEFORE .subscribe(), cleanup on unmount
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`inbox_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'connections',
        filter: `receiver_id=eq.${userId}`
      }, async (payload) => {
        if (payload.new.status !== 'pending') return;

        const { data: senderData } = await supabase
          .from('profiles')
          .select('username, avatar_url, rating_average')
          .eq('id', payload.new.sender_id)
          .single();

        if (senderData) {
          setRequests(prev => [{ ...payload.new, profiles: senderData }, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleAction = async (id: string, status: 'accepted' | 'rejected') => {
    await supabase.from('connections').update({ status }).eq('id', id);
    setRequests(reqs => reqs.filter(r => r.id !== id));
  };

  if (requests.length === 0) return null;

  return (
    <div className="absolute top-24 right-6 w-80 max-h-[60vh] overflow-y-auto no-scrollbar z-40 rounded-3xl border border-white/20 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] p-4 flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50 mb-2 px-2">Inbox</h3>
      <AnimatePresence>
        {requests.map(req => (
          <motion.div 
            key={req.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-3 p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/10 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                {req.profiles?.avatar_url && <img src={req.profiles.avatar_url} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">@{req.profiles?.username}</p>
                <p className="text-xs text-amber-500 dark:text-amber-400 font-bold">{req.profiles?.rating_average} ⭐</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAction(req.id, 'accepted')} className="flex-1 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-2 text-xs font-bold hover:bg-emerald-500/30 transition-colors">Accept</button>
              <button onClick={() => handleAction(req.id, 'rejected')} className="flex-1 rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 py-2 text-xs font-bold hover:bg-red-500/20 transition-colors">Reject</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardLayoutUI({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, [supabase.auth]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-transparent selection:bg-indigo-500/30 font-sans">
      
      {/* Top Left Theme Toggle */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute top-6 left-6 z-50 p-3 rounded-full border border-black/10 dark:border-white/20 bg-white/50 dark:bg-black/40 backdrop-blur-xl shadow-lg hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-slate-800 dark:text-white"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      )}

      {/* Floating Message Icon */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="absolute top-24 left-6 z-50 p-4 rounded-full border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-500/20 backdrop-blur-xl shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:bg-indigo-500/20 dark:hover:bg-indigo-500/40 transition-colors text-indigo-600 dark:text-indigo-300"
        title="Open Chat"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Center-Top Title */}
      <Link href="/dashboard" className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
        <h1 className="text-2xl font-black tracking-tighter text-slate-800 dark:text-white/80 drop-shadow-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
          SKILL-XO
        </h1>
      </Link>

      <ProfileBox />
      <InboxOverlay />

      <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} currentUserId={currentUserId} />
      {currentUserId && <LiveSessionController currentUserId={currentUserId} />}

      {/* Main Content Render */}
      <main className="relative z-10 pt-28 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  );
}
