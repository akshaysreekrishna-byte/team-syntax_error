'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatInterface({ connectionId, currentUserId }: { connectionId: string, currentUserId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const supabase = createClient();
  const endRef = useRef<HTMLDivElement>(null);

  // Load initial messages and subscribe to realtime
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    }
    loadMessages();

    const channel = supabase
      .channel(`chat_${connectionId}`)
      .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_id=eq.${connectionId}` },
          (payload) => setMessages(prev => [...prev, payload.new])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [connectionId, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Optimistic UI insert
    const tempMsg = { id: Date.now().toString(), sender_id: currentUserId, text: input };
    setMessages(prev => [...prev, tempMsg]);
    setInput('');

    await supabase.from('messages').insert({
      connection_id: connectionId,
      sender_id: currentUserId,
      text: input
    });
  };

  return (
    <div className="flex flex-col h-[70vh] rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      {/* Glass Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          <h3 className="font-bold text-white tracking-wide">Live Chat</h3>
        </div>
        
        <button className="rounded-full bg-indigo-500/10 border border-indigo-400/20 px-5 py-2.5 text-xs font-bold text-indigo-300 transition-all hover:bg-indigo-500/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] relative overflow-hidden group tracking-wider uppercase">
          <span className="relative z-10 flex items-center gap-2">🗓 Schedule Session</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar scroll-smooth relative">
        {messages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <p className="text-sm font-medium tracking-widest uppercase">Start the conversation</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map(msg => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95, y: 10, originY: 1 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-3xl px-6 py-3.5 text-[0.95rem] leading-relaxed shadow-lg backdrop-blur-md ${
                  isMe 
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-sm border border-indigo-400/30' 
                    : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/10'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl">
        <form 
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex gap-3"
        >
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 focus:bg-white/10 transition-all font-light shadow-inner"
            placeholder="Type your message..."
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="rounded-full bg-white px-8 font-bold text-slate-900 hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
