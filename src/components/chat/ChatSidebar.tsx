'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { X, Send, Clock } from 'lucide-react';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function ChatSidebar({ isOpen, onClose, currentUserId }: ChatSidebarProps) {
  const supabase = createClient();
  const [connections, setConnections] = useState<any[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activePeerProfile, setActivePeerProfile] = useState<any>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch accepted connections (could be sender or receiver)
  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    
    async function fetchConnections() {
      const { data } = await supabase
        .from('connections')
        .select(`
          id, sender_id, receiver_id, status,
          sender:profiles!connections_sender_id_fkey(id, username, avatar_url),
          receiver:profiles!connections_receiver_id_fkey(id, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (data) {
        // Map out the "other" person along with the connection id
        const formatted = data.map((conn: any) => {
          const isSender = conn.sender_id === currentUserId;
          const peer = isSender ? conn.receiver : conn.sender;
          return { ...peer, connectionId: conn.id };
        });
        setConnections(formatted);
      }
    }
    fetchConnections();
  }, [isOpen, currentUserId]);

  // Fetch active thread by connection_id and subscribe to new messages
  useEffect(() => {
    if (!activeConnectionId || !currentUserId) return;

    async function loadThread() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', activeConnectionId)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data);
    }
    loadThread();

    // Subscribe to real-time inserts for this connection thread
    const channel = supabase.channel(`messages_${activeConnectionId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `connection_id=eq.${activeConnectionId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConnectionId, currentUserId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConnectionId || !currentUserId) return;
    
    const msgText = inputText.trim();
    setInputText('');

    await supabase.from('messages').insert({
      connection_id: activeConnectionId,
      sender_id: currentUserId,
      text: msgText,
    });
  };

  const scheduleSession = async () => {
    if (!activeConnectionId || !currentUserId) return;
    const { error } = await supabase.from('sessions').insert({
      connection_id: activeConnectionId,
      scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'scheduled'
    });
    if (!error) {
      alert("Session officially scheduled!");
      // Fire a system message into the chat thread
      await supabase.from('messages').insert({
        connection_id: activeConnectionId,
        sender_id: currentUserId,
        text: "📅 I scheduled a live session for 1 hour from now."
      });
    } else {
      alert("Failed to schedule session: " + error.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed left-0 top-0 bottom-0 w-full sm:w-96 z-50 flex flex-col bg-white/40 dark:bg-black/60 backdrop-blur-3xl border-r border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.2)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Messages</h2>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live WebSocket Channel
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-slate-700 dark:text-white" />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Peer List (if no active thread) */}
            {!activeConnectionId ? (
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
                {connections.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-white/40 text-center mt-10 font-medium">No active connections yet. Accept requests in your Inbox or Explore the grid!</p>
                )}
                {connections.map(peer => (
                  <button 
                    key={peer.id}
                    onClick={() => {
                      setActiveConnectionId(peer.connectionId);
                      setActivePeerProfile(peer);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors text-left"
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-300 dark:bg-slate-800">
                      {peer.avatar_url && <img src={peer.avatar_url} className="object-cover w-full h-full" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">@{peer.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Active Chat Thread */
              <div className="flex-1 flex flex-col h-full bg-slate-50/20 dark:bg-black/20">
                {/* Thread Header */}
                <div className="flex items-center gap-3 p-4 border-b border-indigo-500/10 bg-indigo-500/5 backdrop-blur-md shrink-0">
                  <button onClick={() => { setActiveConnectionId(null); setMessages([]); }} className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-indigo-300 p-2 hover:bg-black/10 rounded-lg">
                    ← Back
                  </button>
                  <p className="font-bold text-slate-800 dark:text-white">@{activePeerProfile?.username}</p>
                </div>
                
                {/* Schedule Session Action Bar */}
                <div className="p-3 shrink-0 flex justify-center border-b border-white/5">
                  <button 
                    onClick={scheduleSession}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all font-mono"
                  >
                    <Clock className="w-4 h-4" />
                    + Schedule Session (1h from now)
                  </button>
                </div>

                {/* Messages View */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <motion.div 
                        key={msg.id || i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className={`p-4 rounded-2xl text-sm ${
                          isMe 
                            ? 'bg-indigo-600 text-white rounded-br-sm' 
                            : 'bg-white text-slate-800 dark:bg-white/10 dark:text-white rounded-bl-sm border border-black/5 dark:border-white/10'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-white/30 mt-1 px-1 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white/40 dark:bg-black/40 border-t border-white/10 shrink-0 flex gap-2">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/50 dark:bg-white/5 border border-white/20 rounded-full px-5 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-white/30 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                  />
                  <button 
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
