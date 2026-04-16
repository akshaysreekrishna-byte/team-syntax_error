'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { Play, Square, Star } from 'lucide-react';

interface LiveSessionControllerProps {
  currentUserId: string;
}

export default function LiveSessionController({ currentUserId }: LiveSessionControllerProps) {
  const supabase = createClient();
  const [upcomingSession, setUpcomingSession] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [reviewTarget, setReviewTarget] = useState<any>(null);

  const [stopwatch, setStopwatch] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Poll for upcoming sessions via the connections table
  useEffect(() => {
    if (!currentUserId) return;
    
    const checkSessions = async () => {
      // Sessions link to connections, connections link to profiles
      const { data } = await supabase
        .from('sessions')
        .select(`
          id, connection_id, status, scheduled_for,
          connections (
            id, sender_id, receiver_id,
            sender:profiles!connections_sender_id_fkey(id, username, avatar_url),
            receiver:profiles!connections_receiver_id_fkey(id, username, avatar_url)
          )
        `)
        .eq('status', 'scheduled')
        .gt('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(1)
        .single();
        
      if (data) setUpcomingSession(data);
      else setUpcomingSession(null);
    };

    checkSessions();
    const interval = setInterval(checkSessions, 10000);
    return () => clearInterval(interval);
  }, [currentUserId, supabase]);

  // Stopwatch timer
  useEffect(() => {
    let interval: any;
    if (activeSession) {
      interval = setInterval(() => setStopwatch(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const getPeer = (session: any) => {
    if (!session?.connections) return null;
    const conn = session.connections;
    const isSender = conn.sender_id === currentUserId;
    return isSender ? conn.receiver : conn.sender;
  };

  const isMySession = (session: any) => {
    if (!session?.connections) return false;
    const conn = session.connections;
    return conn.sender_id === currentUserId || conn.receiver_id === currentUserId;
  };

  const startSession = async () => {
    if (!upcomingSession) return;
    await supabase.from('sessions').update({ status: 'in_progress' }).eq('id', upcomingSession.id);
    setActiveSession(upcomingSession);
    setUpcomingSession(null);
    setStopwatch(0);
  };

  const endSession = async () => {
    if (!activeSession) return;
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', activeSession.id);
    const peer = getPeer(activeSession);
    setReviewTarget({
      sessionId: activeSession.id,
      ...peer
    });
    setActiveSession(null);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    setSubmittingReview(true);
    
    // 1. Insert review
    await supabase.from('reviews').insert({
      session_id: reviewTarget.sessionId,
      reviewer_id: currentUserId,
      reviewee_id: reviewTarget.id,
      rating,
      feedback: comment
    });

    // 2. Trust Algorithm: update running average
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('rating_average, sessions_completed')
      .eq('id', reviewTarget.id)
      .single();

    if (targetProfile) {
      const currentAvg = parseFloat(targetProfile.rating_average) || 5.0;
      const currentCompleted = parseInt(targetProfile.sessions_completed) || 0;
      
      const newCompleted = currentCompleted + 1;
      const newAvg = ((currentAvg * currentCompleted) + rating) / newCompleted;
      
      await supabase.from('profiles').update({
        rating_average: newAvg.toFixed(1),
        sessions_completed: newCompleted
      }).eq('id', reviewTarget.id);
    }

    setReviewTarget(null);
    setSubmittingReview(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      <AnimatePresence>
        {/* Priority Toast Notification */}
        {upcomingSession && isMySession(upcomingSession) && !activeSession && !reviewTarget && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md"
          >
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/20 backdrop-blur-3xl shadow-[0_10px_40px_rgba(245,158,11,0.2)] p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Upcoming Session
                </p>
                <p className="text-xs text-slate-600 dark:text-amber-200/80 mt-1">
                  with <strong className="text-slate-800 dark:text-white">@{getPeer(upcomingSession)?.username}</strong>
                </p>
              </div>
              <button 
                onClick={startSession}
                className="px-4 py-2 rounded-xl bg-amber-500 text-amber-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                Join Now →
              </button>
            </div>
          </motion.div>
        )}

        {/* Live Session Stopwatch HUD */}
        {activeSession && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 bg-slate-900/40 backdrop-blur-lg"
          >
            <div className="rounded-[3rem] border border-emerald-500/30 bg-emerald-500/10 p-12 backdrop-blur-3xl shadow-[0_0_100px_rgba(16,185,129,0.2)] text-center w-full max-w-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.3)_0%,transparent_70%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-sm tracking-widest uppercase mb-8">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Session Live
                </div>
                
                <p className="text-white/60 mb-2">Exchanging knowledge with</p>
                <div className="flex items-center gap-3 mb-8 bg-black/40 px-6 py-3 rounded-2xl border border-white/10">
                  {getPeer(activeSession)?.avatar_url && (
                    <img src={getPeer(activeSession)?.avatar_url} className="w-10 h-10 rounded-full object-cover border border-white/20" />
                  )}
                  <span className="text-xl font-bold text-white">@{getPeer(activeSession)?.username}</span>
                </div>

                <div className="text-7xl md:text-8xl font-black text-white font-mono tracking-tighter mb-12 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                  {formatTime(stopwatch)}
                </div>

                <button 
                  onClick={endSession}
                  className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-red-500/20 border border-red-500/30 text-red-100 font-bold text-lg hover:bg-red-500/40 hover:border-red-500/50 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-red-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                  <Square className="w-5 h-5 relative z-10 group-hover:text-white transition-colors fill-current" />
                  <span className="relative z-10 group-hover:text-white transition-colors">End Session</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Forced Accountability Review Modal */}
        {reviewTarget && (
          <motion.div
            initial={{ backdropFilter: "blur(0px)", backgroundColor: "rgba(0,0,0,0)" }}
            animate={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(0,0,0,0.8)" }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="rounded-[2.5rem] border border-white/10 bg-white/5 p-10 md:p-14 backdrop-blur-3xl shadow-[0_4px_50px_rgba(0,0,0,0.5)] w-full max-w-lg flex flex-col items-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none" />
              
              <h2 className="text-3xl font-black text-white text-center mb-2 relative z-10">Rate your Session</h2>
              <p className="text-white/50 text-center mb-8 relative z-10">How was your exchange with @{reviewTarget.username}?</p>

              <div className="flex items-center justify-center gap-2 mb-8 relative z-10">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-2 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star 
                      className={`w-10 h-10 ${star <= rating ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'fill-transparent text-white/20'}`} 
                    />
                  </button>
                ))}
              </div>

              <textarea 
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Leave a private accountability note..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 resize-none h-32 mb-8 focus:outline-none focus:border-indigo-500/50 relative z-10"
              />

              <button 
                onClick={submitReview}
                disabled={submittingReview}
                className="w-full relative z-10 rounded-full bg-indigo-600 px-8 py-4 font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
              >
                {submittingReview ? 'Submitting...' : 'Submit & Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
