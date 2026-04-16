'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import GlassUserCard from '@/components/ui/GlassUserCard';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userState, setUserState] = useState({
    username: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100',
    rating: 5.0,
    teaching: [] as string[],
    learning: [] as string[]
  });
  
  const [tempSkill, setTempSkill] = useState('');
  const supabase = createClient();

  const handleComplete = async () => {
    try {
      setLoading(true);

      // 1. Explicitly fetch the current authenticated user first
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      // 2. Catch the missing user instantly before hitting the database
      if (authError || !user) {
        throw new Error("No user found. Your login session may have expired.");
      }

      // 3. Now perform your database insert, making sure to use the user.id
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id, // CRITICAL: This links the profile row to the Auth user
          username: userState.username,
          avatar_url: userState.avatar,
          skills_have: userState.teaching,
          skills_want: userState.learning,
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // 4. Success! Route to Phase 2.
      router.push('/dashboard');

    } catch (error: any) {
      console.error('Error saving profile:', error.message);
      alert('Error saving profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleAddSkill = (type: 'teaching' | 'learning') => {
    if (!tempSkill.trim()) return;
    setUserState(prev => ({
      ...prev,
      [type]: [...prev[type], tempSkill.trim()]
    }));
    setTempSkill('');
  };

  const removeSkill = (type: 'teaching' | 'learning', skillToRemove: string) => {
    setUserState(prev => ({
      ...prev,
      [type]: prev[type].filter(skill => skill !== skillToRemove)
    }));
  };

  return (
    <div className="min-h-screen relative bg-slate-950 text-white flex overflow-hidden selection:bg-indigo-500/30">
      {/* Ambient background styling */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_50%,rgba(79,70,229,0.1)_0%,transparent_50%),radial-gradient(circle_at_70%_20%,rgba(16,185,129,0.05)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

      {/* Left side: Animated Multi-Step Form */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-24">
        
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            Build your profile.
          </h1>
          <p className="text-white/50 font-medium">Step {step} of 3</p>
          
          {/* Progress Bar Indicator */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full bg-white transition-all duration-500 ${step >= i ? 'opacity-100 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'opacity-20'}`} />
            ))}
          </div>
        </div>

        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Claim your Username</label>
                  <input 
                    type="text" 
                    placeholder="e.g. alex_dev"
                    value={userState.username}
                    onChange={e => setUserState(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-lg text-white placeholder-white/20 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none backdrop-blur-md shadow-inner"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-3">Skills you can Teach</label>
                  <p className="text-sm text-white/50 mb-4">Add tools, languages, or concepts you are deeply proficient in sharing.</p>
                  
                  <form onSubmit={e => { e.preventDefault(); handleAddSkill('teaching'); }} className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="e.g. React, Figma, SQL"
                      value={tempSkill}
                      onChange={e => setTempSkill(e.target.value)}
                      className="flex-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-4 text-white placeholder-white/20 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] transition-all outline-none backdrop-blur-md"
                    />
                    <button 
                      type="submit"
                      disabled={!tempSkill.trim()}
                      className="rounded-2xl border border-white/10 bg-white/10 px-8 font-bold hover:bg-emerald-500 hover:border-emerald-400 hover:text-emerald-950 transition-all disabled:opacity-50"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-3">Skills you want to Learn</label>
                  <p className="text-sm text-white/50 mb-4">Add tools or concepts you are actively looking to be mentored in.</p>
                  
                  <form onSubmit={e => { e.preventDefault(); handleAddSkill('learning'); }} className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="e.g. Rust, System Design"
                      value={tempSkill}
                      onChange={e => setTempSkill(e.target.value)}
                      className="flex-1 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 px-6 py-4 text-white placeholder-white/20 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-[inset_0_0_20px_rgba(79,70,229,0.05)] transition-all outline-none backdrop-blur-md"
                    />
                    <button 
                      type="submit"
                      disabled={!tempSkill.trim()}
                      className="rounded-2xl border border-white/10 bg-white/10 px-8 font-bold hover:bg-indigo-500 hover:border-indigo-400 hover:text-indigo-50 transition-all disabled:opacity-50"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Global Navigation Controller */}
        <div className="flex justify-between items-center mt-12 bg-white/5 p-2 rounded-full border border-white/10 backdrop-blur-xl">
          <button 
            onClick={prevStep}
            disabled={step === 1}
            className="px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-20 hover:bg-white/10"
          >
            ← Back
          </button>

          {step < 3 ? (
            <button 
              onClick={nextStep}
              className="px-8 py-3 rounded-full bg-white text-black text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
            >
              Continue →
            </button>
          ) : (
            <button 
              onClick={handleComplete}
              disabled={loading || !userState.username}
              className="px-8 py-3 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Right side: Live Visual Profile Preview */}
      <div className="hidden lg:flex w-1/2 relative bg-black/40 border-l border-white/10 flex-col items-center justify-center p-12 overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:32px_32px] pointer-events-none" />
        
        <div className="absolute top-10 left-10 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Live Matrix Injection</h3>
        </div>
        
        <motion.div 
          animate={{ y: [-10, 10, -10] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 w-full flex justify-center"
        >
          {/* We import and render the exact GlassUserCard component passing our live state! */}
          <GlassUserCard 
            user={{
              username: userState.username || 'ghost_user',
              avatar: userState.avatar,
              rating: 5.0,
              teaching: userState.teaching.length ? userState.teaching : ['—'],
              learning: userState.learning.length ? userState.learning : ['—']
            }}
            onConnect={() => {}}
          />
        </motion.div>
      </div>
      
    </div>
  );
}
