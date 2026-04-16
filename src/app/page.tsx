'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const supabase = createClient();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Track the scroll globally to guarantee strict timeline constraints and absolute visual isolation
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.25) {
      setActiveIndex(0); // Text 1
    } else if (latest >= 0.25 && latest < 0.5) {
      setActiveIndex(1); // Text 2
    } else if (latest >= 0.5 && latest < 0.75) {
      setActiveIndex(2); // Text 3
    } else if (latest >= 0.75) {
      setActiveIndex(3); // Auth Gate
    }
  });

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  };

  const variants = {
    initial: { opacity: 0, y: 50, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -50, scale: 1.05 }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[400vh] bg-transparent">
      
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        
        <AnimatePresence mode="wait">
          
          {/* Node 1 */}
          {activeIndex === 0 && (
            <motion.div 
              key="node1"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4"
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 drop-shadow-2xl">
                Learning alone is broken.
              </h1>
              <p className="mt-6 text-xl md:text-2xl text-white/60 font-medium text-center">
                Tutorial rot and unanswered questions kill growth.
              </p>
            </motion.div>
          )}

          {/* Node 2 */}
          {activeIndex === 1 && (
            <motion.div 
              key="node2"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4"
            >
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-center text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.5)]">
                What if it wasn't?
              </h2>
              <p className="mt-6 text-xl md:text-2xl text-white/80 font-medium text-center">
                A peer-to-peer network of human knowledge.
              </p>
            </motion.div>
          )}

          {/* Node 3 */}
          {activeIndex === 2 && (
            <motion.div 
              key="node3"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4"
            >
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-center text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]">
                Trade Skills.
              </h2>
              <p className="mt-6 text-xl md:text-2xl text-white/80 font-medium text-center max-w-2xl">
                Teach what you know. Learn what you need. Real-time video scheduling and accountability.
              </p>
            </motion.div>
          )}

          {/* Auth Gate - Pushed exactly to its dedicated stage */}
          {activeIndex === 3 && (
            <motion.div 
              key="gate"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4 z-50 pointer-events-auto"
            >
              <div className="rounded-[2.5rem] border border-white/20 bg-white/10 dark:bg-black/20 p-10 md:p-16 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] text-center w-full max-w-md relative overflow-hidden group">
                
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <h3 className="text-4xl md:text-5xl font-black mb-8 relative z-10 tracking-tight">SKILL-XO</h3>
                <p className="text-white/60 mb-10 relative z-10 text-sm">Join the exchange network</p>
                
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="relative z-10 w-full inline-flex items-center justify-center gap-4 rounded-full bg-white/10 dark:bg-black/40 border border-white/30 px-8 py-4 text-lg font-bold text-slate-800 dark:text-white transition-all hover:bg-white/20 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 21.53 7.7 24 12 24z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 4.62c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.18 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {isAuthenticating ? 'Connecting...' : 'Continue with Google'}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      
      {/* Scroll Hint */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-slate-500 dark:text-white/50 animate-bounce pointer-events-none">
        <span className="text-xs uppercase tracking-widest mb-2 font-mono">Scroll</span>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
}
