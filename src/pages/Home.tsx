import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Linkedin, Instagram, Facebook, MessageCircle, Twitter, Sparkles, Moon, Sun, Mail, Phone, Send, Volume2, VolumeX } from 'lucide-react';
import { generateClickSound } from '../services/geminiService';

const platforms = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'from-[#0A66C2] to-[#004182]',
    description: 'Professional networking & thought leadership'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'from-[#E1306C] to-[#833AB4]',
    description: 'Visual storytelling & brand building'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'from-[#1877F2] to-[#0C58B8]',
    description: 'Community engagement & updates'
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: MessageCircle,
    color: 'from-[#000000] to-[#333333]',
    description: 'Text-based conversations & trends'
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'from-[#1DA1F2] to-[#0D8BD9]',
    description: 'Real-time updates & concise thoughts'
  }
];

interface Comment {
  id: number;
  name: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [themeMode, setThemeMode] = useState(0); // 0: dark, 1: light, 2: dynamic
  const [isMuted, setIsMuted] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [clickSoundUrl, setClickSoundUrl] = useState<string | null>(null);

  useEffect(() => {
    // Generate the custom click sound on mount
    const initSound = async () => {
      const url = await generateClickSound();
      if (url) {
        setClickSoundUrl(url);
      } else {
        // Fallback sound
        setClickSoundUrl('https://assets.mixkit.co/active_storage/sfx/2997/2997-preview.mp3');
      }
    };
    initSound();
  }, []);

  // Sound effect
  const playClickSound = () => {
    if (!isMuted && clickSoundUrl) {
      const audio = new Audio(clickSoundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  };

  useEffect(() => {
    document.body.classList.remove('light-theme', 'dynamic-theme');
    if (themeMode === 1) {
      document.body.classList.add('light-theme');
    } else if (themeMode === 2) {
      document.body.classList.add('dynamic-theme');
    }
  }, [themeMode]);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch('/api/comments');
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim()) return;
    
    playClickSound();
    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCommentName.trim() || 'Anonymous',
          content: newCommentContent.trim()
        })
      });
      
      if (res.ok) {
        setNewCommentName('');
        setNewCommentContent('');
        fetchComments();
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const isLightMode = themeMode === 1;
  const isDynamicMode = themeMode === 2;
  const textColor = isLightMode || isDynamicMode ? 'text-slate-800' : 'text-white';
  const subTextColor = isLightMode || isDynamicMode ? 'text-slate-600' : 'text-white/70';
  const metaTextColor = isLightMode || isDynamicMode ? 'text-slate-500' : 'text-white/50';

  return (
    <div className={`min-h-screen font-sans selection:bg-purple-500/30 flex flex-col items-center justify-start p-6 relative overflow-hidden transition-colors duration-500 ${textColor}`}>
      
      {/* Top Navigation Bar */}
      <div className="w-full max-w-6xl flex justify-between items-start z-50 pt-4">
        {/* Mute Toggle */}
        <button
          onClick={() => {
            setIsMuted(!isMuted);
            if (isMuted) {
              // Play sound when unmuting
              if (clickSoundUrl) {
                const audio = new Audio(clickSoundUrl);
                audio.volume = 0.5;
                audio.play().catch(() => {});
              }
            }
          }}
          className="glass-panel p-3 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Toggle sound"
        >
          {isMuted ? <VolumeX className={`w-5 h-5 ${textColor}`} /> : <Volume2 className={`w-5 h-5 ${textColor}`} />}
        </button>

        {/* Header Content */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-2xl mx-4 flex flex-col items-center justify-center w-full mt-8"
        >
          <div className={`mb-2 text-lg font-medium tracking-wide ${isLightMode || isDynamicMode ? 'text-purple-600' : 'text-purple-300'}`}>
            AI-Powered Social Media Handler
          </div>
          
          <div className="relative flex flex-col items-center mb-6">
            <h1 className={`text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent flex items-center justify-center gap-2 ${isLightMode || isDynamicMode ? 'bg-gradient-to-r from-slate-800 via-slate-600 to-slate-400' : 'bg-gradient-to-r from-white via-white to-white/60'}`}>
              Easy with <span className="relative">DC
                <svg className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-3 text-white" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M10,5 Q50,20 90,5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
          </div>
          
          <p className={`text-lg font-light leading-relaxed ${subTextColor}`}>
            "People may die but Ideas never" 
            <br />
            <span className={`text-xs italic mt-2 block ${metaTextColor}`}>- 𓄂𝘿èé𝙥𝙖𝙣♔</span>
          </p>
        </motion.div>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            setThemeMode((prev) => (prev + 1) % 3);
            playClickSound();
          }}
          className="glass-panel p-3 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Toggle theme"
        >
          {themeMode === 0 && <Moon className="w-5 h-5 text-white" />}
          {themeMode === 1 && <Sun className="w-5 h-5 text-yellow-500" />}
          {themeMode === 2 && <Sparkles className="w-5 h-5 text-purple-500" />}
        </button>
      </div>

      {/* Professional Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 50, repeat: Infinity, ease: "linear" },
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
          className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[100px] mix-blend-screen opacity-30 ${isLightMode || isDynamicMode ? 'bg-purple-300' : 'bg-purple-600'}`}
        />
        <motion.div 
          animate={{ 
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
            scale: { duration: 15, repeat: Infinity, ease: "easeInOut" }
          }}
          className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] mix-blend-screen opacity-20 ${isLightMode || isDynamicMode ? 'bg-blue-300' : 'bg-blue-600'}`}
        />
        <motion.div 
          animate={{ 
            y: [0, -50, 0],
            x: [0, 30, 0],
          }}
          transition={{ 
            duration: 20, repeat: Infinity, ease: "easeInOut" 
          }}
          className={`absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full blur-[90px] mix-blend-screen opacity-20 ${isLightMode || isDynamicMode ? 'bg-emerald-200' : 'bg-emerald-500'}`}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full z-10 mt-16 mb-24 relative"
      >
        {platforms.map((platform, index) => (
          <Link key={platform.id} to={`/${platform.id}`} onClick={playClickSound}>
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`glass-panel p-6 rounded-3xl h-full flex flex-col items-start relative group transition-all duration-300 ${isLightMode || isDynamicMode ? 'hover:bg-white/40' : 'hover:bg-white/10'}`}
            >
              {/* Shining Border */}
              <div className="shining-border-container">
                <div className="shining-border-spin"></div>
              </div>

              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${platform.color} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity -mr-10 -mt-10 pointer-events-none`}></div>
              
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${platform.color} mb-4 shadow-lg relative z-10`}>
                <platform.icon className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-2 relative z-10">{platform.name}</h3>
              <p className={`text-sm leading-relaxed relative z-10 ${subTextColor}`}>{platform.description}</p>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* Comments Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full max-w-4xl z-10 mb-24"
      >
        <div className="glass-panel p-8 rounded-3xl">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Community Thoughts
          </h2>
          
          <form onSubmit={handleSubmitComment} className="mb-8 space-y-4">
            <input
              type="text"
              placeholder="Your Name (optional)"
              value={newCommentName}
              onChange={(e) => setNewCommentName(e.target.value)}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm"
            />
            <textarea
              placeholder="Share your thoughts with everyone..."
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              rows={3}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm resize-none"
              required
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !newCommentContent.trim()}
              className="glass-button px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmittingComment ? 'Posting...' : (
                <>
                  <Send className="w-4 h-4" />
                  Post Comment
                </>
              )}
            </button>
          </form>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {comments.length === 0 ? (
              <p className={`text-center py-8 italic ${metaTextColor}`}>No comments yet. Be the first to share!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="glass-panel p-4 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">{comment.name}</span>
                    <span className={`text-xs ${metaTextColor}`}>
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm ${textColor}`}>{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="w-full z-10 mt-auto pt-12 pb-6 border-t border-white/10 flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-4">
          <a href="mailto:hackermachi1243@gmail.com" className="glass-button px-4 py-2 rounded-full flex items-center gap-2 text-sm hover:scale-105 transition-transform">
            <Mail className="w-4 h-4" />
            Email
          </a>
          <a href="https://wa.me/918668177427" target="_blank" rel="noopener noreferrer" className="glass-button px-4 py-2 rounded-full flex items-center gap-2 text-sm hover:scale-105 transition-transform">
            <Phone className="w-4 h-4" />
            WhatsApp
          </a>
          <a href="https://instagram.com/brain_0_conner" target="_blank" rel="noopener noreferrer" className="glass-button px-4 py-2 rounded-full flex items-center gap-2 text-sm hover:scale-105 transition-transform">
            <Instagram className="w-4 h-4" />
            Instagram
          </a>
        </div>
        <p className={`text-sm tracking-widest uppercase ${metaTextColor}`}>
          copyrights@Deepan Chakravarthy
        </p>
      </footer>
    </div>
  );
}