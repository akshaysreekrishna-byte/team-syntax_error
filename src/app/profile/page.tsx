'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

type SessionType = {
  id: string;
  peerName: string;
  peerAvatar: string;
  date: string;
};

// Simple SVG Icons
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 group-hover:drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] transition-all"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [userState, setUserState] = useState({
    id: '',
    username: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100',
    rating: 0,
    teaching: [] as string[],
    learning: [] as string[]
  });
  const [sessions, setSessions] = useState<SessionType[]>([]);
  
  const [tempTeaching, setTempTeaching] = useState('');
  const [tempLearning, setTempLearning] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfileData() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Auth error", authError);
        router.push('/sign-in'); // Fallback if no user
        return;
      }

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        setUserState({
          id: user.id,
          username: profile.username || '',
          avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100',
          rating: profile.rating_average || 0,
          teaching: profile.skills_have || [],
          learning: profile.skills_want || []
        });
      }

      // 2. Fetch Sessions explicitly mapping connection sides
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select(`
          id,
          scheduled_for,
          status,
          connections (
            id,
            sender_id,
            receiver_id,
            sender:profiles!connections_sender_id_fkey(username, avatar_url),
            receiver:profiles!connections_receiver_id_fkey(username, avatar_url)
          )
        `)
        .eq('status', 'completed');

      if (sessionsData) {
        // Filter to only sessions involving this user and format them
        const userSessions = sessionsData
          .filter((s: any) => 
            s.connections && 
            (s.connections.sender_id === user.id || s.connections.receiver_id === user.id)
          )
          .map((s: any) => {
            const isSender = s.connections.sender_id === user.id;
            const peer = isSender ? s.connections.receiver : s.connections.sender;
            return {
              id: s.id,
              peerName: peer?.username || 'Unknown User',
              peerAvatar: peer?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100',
              date: new Date(s.scheduled_for).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            };
          });
        setSessions(userSessions);
      }
      
      setLoading(false);
    }
    
    fetchProfileData();
  }, [router, supabase]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !userState.id) return;
    const file = e.target.files[0];
    
    setUploading(true);
    
    // Optimistic UI — show the image immediately
    const objectUrl = URL.createObjectURL(file);
    setUserState(prev => ({ ...prev, avatar: objectUrl }));
    
    try {
      // Upload to Supabase Storage Bucket ("avatars")
      const fileExt = file.name.split('.').pop();
      const fileName = `${userState.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      // Retrieve the permanent public URL
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const permanentUrl = publicUrlData.publicUrl;
      
      // Immediately persist to the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: permanentUrl, updated_at: new Date().toISOString() })
        .eq('id', userState.id);
        
      if (updateError) throw updateError;
      
      setUserState(prev => ({ ...prev, avatar: permanentUrl }));
      showToast('Profile picture saved!', 'success');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      showToast('Upload failed: ' + (err.message || 'Unknown error'), 'error');
      // Revert to previous avatar on failure
    } finally {
      setUploading(false);
      // Reset file input so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddSkill = (type: 'teaching' | 'learning') => {
    if (type === 'teaching' && !tempTeaching.trim()) return;
    if (type === 'learning' && !tempLearning.trim()) return;
    
    const val = type === 'teaching' ? tempTeaching.trim() : tempLearning.trim();
    
    setUserState(prev => ({
      ...prev,
      [type]: [...prev[type], val]
    }));
    
    if (type === 'teaching') setTempTeaching('');
    else setTempLearning('');
  };

  const removeSkill = (type: 'teaching' | 'learning', skillToRemove: string) => {
    setUserState(prev => ({
      ...prev,
      [type]: prev[type].filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSave = async () => {
    if (!userState.id) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: userState.username,
          avatar_url: userState.avatar,
          skills_have: userState.teaching,
          skills_want: userState.learning,
          updated_at: new Date().toISOString()
        })
        .eq('id', userState.id);
        
      if (error) throw error;
      
      // Optional: show a toast or success feedback here
    } catch (e: any) {
      alert('Error updating profile: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-slate-950 text-white flex justify-center p-6 sm:p-12 overflow-hidden selection:bg-indigo-500/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.15)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.1)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none mix-blend-overlay" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border backdrop-blur-2xl shadow-lg font-bold text-sm tracking-wide ${
              toast.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
                : 'bg-red-500/20 border-red-500/30 text-red-300 shadow-red-500/10'
            }`}
          >
            {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home Button */}
      <Link href="/dashboard" className="fixed top-6 left-6 z-50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-2xl shadow-lg hover:bg-white/20 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m15 18-6-6 6-6"/></svg>
          <span className="text-sm font-bold text-white tracking-wide">Dashboard</span>
        </motion.div>
      </Link>

      {/* Main Glassmorphic Container using Framer Motion */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-4xl flex flex-col gap-8 rounded-[2.5rem] bg-white/10 dark:bg-black/20 backdrop-blur-2xl border border-white/20 p-8 sm:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.3)] pb-32"
      >
        {/* 1 & 2. Editable Header & Trust Layer */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-8 border-b border-white/10">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-2">
              <div 
                className="relative w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden group cursor-pointer shadow-2xl"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <img 
                  src={userState.avatar} 
                  alt="Profile Avatar" 
                  className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${uploading ? 'opacity-50 scale-105 blur-[1px]' : ''}`}
                />
                {/* Upload spinner */}
                {uploading ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <CameraIcon />
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </div>
              <button 
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors tracking-wide"
              >
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
            </div>
            
            {/* Username input */}
            <div className="flex-1 w-full text-center sm:text-left space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/50 font-bold ml-1">Username</label>
              <input 
                type="text" 
                value={userState.username}
                onChange={e => setUserState(prev => ({ ...prev, username: e.target.value }))}
                className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-white placeholder-white/20 focus:outline-none focus:ring-2 ring-indigo-500/50 rounded-xl px-2 py-1 -ml-2 transition-all hover:bg-white/5"
              />
            </div>
          </div>

          {/* Trust Layer (Read-Only) */}
          <div className="flex-shrink-0 mt-4 sm:mt-0 pt-6">
            <div className="flex items-center gap-3 px-6 py-4 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 shadow-inner backdrop-blur-md group cursor-default">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Trust Rating</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{userState.rating.toFixed(2)}</span>
                  <span className="text-sm font-medium text-white/40">/ 5.0</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full">
                <StarIcon />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Skills Matrix (Editable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* Teaching Panel */}
          <div className="rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 p-6 sm:p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <h3 className="text-sm uppercase tracking-widest font-bold text-emerald-400 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Skills I Can Teach
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-8 min-h-[60px]">
              <AnimatePresence>
                {userState.teaching.map(skill => (
                  <motion.span 
                    key={skill}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-emerald-500/30 text-sm font-medium text-white backdrop-blur-md shadow-sm"
                  >
                    {skill}
                    <button 
                      onClick={() => removeSkill('teaching', skill)}
                      className="p-0.5 rounded-full hover:bg-emerald-500/50 hover:text-white text-emerald-300 transition-colors"
                    >
                      <XIcon />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            
            <form onSubmit={e => { e.preventDefault(); handleAddSkill('teaching'); }} className="flex gap-2 relative z-10">
              <input 
                type="text" 
                placeholder="e.g. React, UX"
                value={tempTeaching}
                onChange={e => setTempTeaching(e.target.value)}
                className="flex-1 min-w-0 bg-black/20 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-emerald-200/30 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button 
                type="submit"
                disabled={!tempTeaching.trim()}
                className="px-6 py-3 bg-emerald-500/20 text-emerald-300 font-bold rounded-xl border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>
          </div>

          {/* Learning Panel */}
          <div className="rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <h3 className="text-sm uppercase tracking-widest font-bold text-indigo-400 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Skills I Want To Learn
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-8 min-h-[60px]">
              <AnimatePresence>
                {userState.learning.map(skill => (
                  <motion.span 
                    key={skill}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-indigo-500/30 text-sm font-medium text-white backdrop-blur-md shadow-sm"
                  >
                    {skill}
                    <button 
                      onClick={() => removeSkill('learning', skill)}
                      className="p-0.5 rounded-full hover:bg-indigo-500/50 hover:text-white text-indigo-300 transition-colors"
                    >
                      <XIcon />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            
            <form onSubmit={e => { e.preventDefault(); handleAddSkill('learning'); }} className="flex gap-2 relative z-10">
              <input 
                type="text" 
                placeholder="e.g. Python, SEO"
                value={tempLearning}
                onChange={e => setTempLearning(e.target.value)}
                className="flex-1 min-w-0 bg-black/20 border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-indigo-200/30 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button 
                type="submit"
                disabled={!tempLearning.trim()}
                className="px-6 py-3 bg-indigo-500/20 text-indigo-300 font-bold rounded-xl border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>
          </div>

        </div>

        {/* 4. Session History (Read-Only) */}
        <div className="pt-8">
          <h3 className="text-lg font-extrabold text-white mb-6">Past Sessions</h3>
          
          <div className="bg-black/30 border border-white/5 rounded-3xl p-6 max-h-[300px] overflow-y-auto no-scrollbar shadow-inner">
            {sessions.length === 0 ? (
              <div className="text-center py-10 text-white/40 font-medium">
                No past sessions found. Connect with peers to start exploring!
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={session.id} 
                    className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <img 
                        src={session.peerAvatar} 
                        alt={session.peerName} 
                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                      />
                      <span className="font-bold text-white text-base">exchanged with <span className="text-indigo-300">{session.peerName}</span></span>
                    </div>
                    <span className="text-xs font-bold text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 tracking-wider uppercase">
                      {session.date}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

      </motion.div>

      {/* 5. Action Bar (Sticky Footer inside absolute container) */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-8 pt-20 px-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="pointer-events-auto rounded-full bg-indigo-600 px-12 py-4 text-white font-bold tracking-wide shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-400/50 hover:bg-indigo-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] active:scale-95 transition-all outline-none disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center min-w-[240px]"
        >
          {saving ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Changes...</span>
            </div>
          ) : (
            'Save Changes'
          )}
        </button>
      </motion.div>

    </div>
  );
}
