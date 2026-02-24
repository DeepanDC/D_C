import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Linkedin, 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Twitter,
  Calendar, 
  Image as ImageIcon, 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Wand2,
  BarChart3,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generatePostContent, generatePostImage, analyzePost, improveText } from '../services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Post {
  id: number;
  platform: string;
  prompt: string;
  content: string;
  image_url: string | null;
  scheduled_at: string;
  status: 'pending' | 'posted' | 'failed';
  error?: string;
  created_at: string;
}

interface User {
  name: string;
  member_id: string;
  followers?: number;
  following?: number;
  posts?: number;
}

const TONES = ['Professional', 'Casual', 'Inspirational', 'Humorous', 'Storytelling'];

const platformConfig: Record<string, any> = {
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: 'from-[#0A66C2] to-[#004182]', theme: 'blue' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'from-[#E1306C] to-[#833AB4]', theme: 'pink' },
  facebook: { name: 'Facebook', icon: Facebook, color: 'from-[#1877F2] to-[#0C58B8]', theme: 'blue' },
  threads: { name: 'Threads', icon: MessageCircle, color: 'from-[#000000] to-[#333333]', theme: 'gray' },
  x: { name: 'X (Twitter)', icon: Twitter, color: 'from-[#1DA1F2] to-[#0D8BD9]', theme: 'sky' }
};

export default function PlatformPage() {
  const { platformId } = useParams<{ platformId: string }>();
  const platform = platformId || 'linkedin';
  const config = platformConfig[platform] || platformConfig.linkedin;
  const Icon = config.icon;

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [tone, setTone] = useState('Professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  
  const [previewContent, setPreviewContent] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{score: number, suggestions: string[]} | null>(null);
  
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
    fetchPosts();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [platform]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          // Simulate profile stats based on platform
          let followers = 0;
          let following = 0;
          let postsCount = 0;
          
          if (platform === 'linkedin') { followers = 1250; following = 500; postsCount = 42; }
          else if (platform === 'instagram') { followers = 15000; following = 800; postsCount = 350; }
          else if (platform === 'facebook') { followers = 800; following = 800; postsCount = 120; }
          else if (platform === 'threads') { followers = 5000; following = 200; postsCount = 85; }
          else if (platform === 'x') { followers = 25000; following = 1200; postsCount = 5400; }

          setUser({ ...data, followers, following, posts: postsCount });
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user", err);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.filter((p: Post) => p.platform === platform));
      }
    } catch (err) {
      console.error("Failed to fetch posts", err);
    }
  };

  const handleConnect = async () => {
    setError(null);
    try {
      if (platform === 'linkedin') {
        const res = await fetch('/api/auth/url');
        if (!res.ok) throw new Error('Failed to fetch auth URL');
        const { url } = await res.json();
        window.open(url, 'linkedin_oauth', 'width=600,height=700');
      } else {
        // Simulate login for other platforms
        const res = await fetch('/api/auth/simulate', { method: 'POST' });
        if (res.ok) {
          fetchUser();
        } else {
          throw new Error('Failed to simulate connection');
        }
      }
    } catch (err: any) {
      setError(`Connection failed: ${err.message}`);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setAnalysis(null);
    setError(null);
    try {
      const [initialContent, image] = await Promise.all([
        generatePostContent(prompt, referenceImage, tone, platform),
        generatePostImage(prompt, referenceImage, platform)
      ]);
      
      // Automatically improve text
      const improvedContent = await improveText(initialContent || '', platform);
      setPreviewContent(improvedContent);
      setPreviewImage(image);

      // Automatically analyze post
      setIsAnalyzing(true);
      try {
        const result = await analyzePost(improvedContent, platform);
        setAnalysis(result);
      } catch (analyzeErr: any) {
        console.error('Analysis failed:', analyzeErr);
        setError(`Analysis failed: ${analyzeErr.message}`);
      } finally {
        setIsAnalyzing(false);
      }

    } catch (err: any) {
      console.error('Generation failed:', err);
      setError(`Generation failed: ${err.message}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!previewContent) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzePost(previewContent, platform);
      setAnalysis(result);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImprove = async () => {
    if (!previewContent) return;
    setIsImproving(true);
    setError(null);
    try {
      const improved = await improveText(previewContent, platform);
      setPreviewContent(improved);
      setAnalysis(null);
    } catch (err: any) {
      console.error('Improvement failed:', err);
      setError(`Improvement failed: ${err.message}`);
    } finally {
      setIsImproving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSchedule = async () => {
    if (!previewContent || !scheduleDate || !scheduleTime) return;
    setError(null);
    
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          prompt,
          content: previewContent,
          image_url: previewImage,
          scheduled_at: scheduledAt
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      setPrompt('');
      setReferenceImage(null);
      setTone('Professional');
      setPreviewContent('');
      setPreviewImage(null);
      setScheduleDate('');
      setScheduleTime('');
      setAnalysis(null);
      fetchPosts();
    } catch (err: any) {
      setError(`Scheduling failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    fetchPosts();
  };

  return (
    <div className={`min-h-screen text-white font-sans selection:bg-white/30 relative overflow-hidden bg-gradient-to-br ${config.color}`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[100px] z-0"></div>
      <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br ${config.color} rounded-full blur-[120px] mix-blend-screen animate-pulse opacity-30 z-0`}></div>
      <div className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl ${config.color} rounded-full blur-[120px] mix-blend-screen animate-pulse opacity-30 z-0`} style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="glass-panel sticky top-0 z-50 border-b-0 border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className={`bg-gradient-to-br ${config.color} p-2 rounded-xl shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {config.name} Studio
            </h1>
          </div>
          
          {user ? (
            <div className="flex items-center gap-6 glass-panel px-6 py-2 rounded-full">
              <div className="hidden md:flex items-center gap-4 text-sm mr-4 border-r border-white/10 pr-6">
                <div className="text-center">
                  <p className="font-bold text-white">{user.posts?.toLocaleString()}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Posts</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-white">{user.followers?.toLocaleString()}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Followers</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-white">{user.following?.toLocaleString()}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Following</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-emerald-400">Connected</p>
              </div>
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold shadow-inner`}>
                {user.name[0]}
              </div>
            </div>
          ) : (
            <button 
              onClick={handleConnect}
              className={`bg-gradient-to-r ${config.color} px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity`}
            >
              <Icon className="w-4 h-4" />
              Connect {config.name}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Creator */}
        <div className="lg:col-span-7 space-y-8">
          <section className="glass-panel rounded-3xl p-8 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${config.color} rounded-full blur-3xl opacity-20 -mr-32 -mt-32 pointer-events-none`}></div>
            
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 opacity-80" />
              Create Masterpiece
            </h2>
            
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2 uppercase tracking-wider">What's on your mind?</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`e.g., Share my thoughts on the future of AI for ${config.name}...`}
                  className="glass-input w-full h-32 p-4 rounded-2xl resize-none text-lg placeholder:text-white/30 focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 uppercase tracking-wider">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map(t => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm transition-all",
                          tone === t 
                            ? `bg-gradient-to-r ${config.color} text-white shadow-lg` 
                            : "glass-button text-white/70 hover:text-white"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2 uppercase tracking-wider">Reference Image</label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer glass-button flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
                      <ImageIcon className="w-4 h-4" />
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {referenceImage && (
                      <div className="relative w-12 h-12 rounded-xl border border-white/20 overflow-hidden group">
                        <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setReferenceImage(null)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={!prompt || isGenerating}
                className={`bg-gradient-to-r ${config.color} w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4 hover:opacity-90 transition-opacity shadow-lg`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-6 h-6" />
                    Generate Post
                  </>
                )}
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-start gap-3 mt-4"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{error}</p>
                    <div className="mt-2 flex gap-3">
                      <button 
                        onClick={() => {
                          setError(null);
                          if (error.includes('Generation')) handleGenerate();
                          else if (error.includes('Scheduling')) handleSchedule();
                          else if (error.includes('Connection')) handleConnect();
                        }}
                        className="text-xs font-bold uppercase tracking-wider hover:text-rose-300 transition-colors"
                      >
                        Auto-Resolve / Retry
                      </button>
                      <button 
                        onClick={() => setError(null)}
                        className="text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          <AnimatePresence>
            {previewContent && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel rounded-3xl overflow-hidden"
              >
                <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <h3 className="font-bold text-lg">Preview</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="glass-button px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-white/10"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 opacity-80" />}
                      Analyze
                    </button>
                    <button 
                      onClick={handleImprove}
                      disabled={isImproving}
                      className="glass-button px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-white/10"
                    >
                      {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 opacity-80" />}
                      Improve
                    </button>
                  </div>
                </div>
                
                <div className="p-8 space-y-6">
                  {analysis && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-white/5 rounded-2xl p-5 border border-white/10"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" 
                              className={analysis.score > 80 ? "text-emerald-400" : analysis.score > 60 ? "text-amber-400" : "text-rose-400"}
                              strokeDasharray={`${(analysis.score / 100) * 175} 175`} 
                            />
                          </svg>
                          <span className="absolute text-lg font-bold">{analysis.score}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">AI Engagement Score</h4>
                          <p className="text-sm text-white/60">Based on {config.name} algorithm patterns</p>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {analysis.suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 opacity-80 shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  <div className="whitespace-pre-wrap text-base leading-relaxed text-white/90 font-light">
                    {previewContent}
                  </div>
                  
                  {previewImage && (
                    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                      <img src={previewImage} alt="AI Generated" className="w-full h-auto" />
                    </div>
                  )}

                  <div className="pt-8 border-t border-white/10 grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase mb-2 tracking-wider">Date</label>
                      <input 
                        type="date" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="glass-input w-full p-3 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase mb-2 tracking-wider">Time</label>
                      <input 
                        type="time" 
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="glass-input w-full p-3 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSchedule}
                    disabled={!scheduleDate || !scheduleTime}
                    className={`bg-gradient-to-r ${config.color} w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg hover:opacity-90`}
                  >
                    <Calendar className="w-6 h-6" />
                    Schedule for Publishing
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Queue */}
        <div className="lg:col-span-5 space-y-8">
          <section className="glass-panel rounded-3xl p-8 min-h-[500px]">
            <h2 className="text-2xl font-bold mb-8 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <Clock className="w-6 h-6 opacity-80" />
                Pipeline
              </span>
              <span className="text-sm bg-white/10 px-3 py-1 rounded-full text-white/80 font-medium border border-white/10">
                {posts.length} Scheduled
              </span>
            </h2>

            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-16 text-white/40">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">Your pipeline is empty.</p>
                  <p className="text-sm mt-2">Create a post to get started.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div 
                    key={post.id}
                    className="group p-5 rounded-2xl glass-panel hover:bg-white/5 transition-all relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 bg-black/20 px-2.5 py-1 rounded-full border border-white/5">
                        {post.status === 'posted' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : post.status === 'failed' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          post.status === 'posted' ? "text-emerald-400" : 
                          post.status === 'failed' ? "text-rose-400" : "text-amber-400"
                        )}>
                          {post.status}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDelete(post.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm font-medium line-clamp-2 mb-4 text-white/90">
                      {post.prompt}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-white/50 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(post.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {post.image_url && (
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Media
                        </span>
                      )}
                    </div>

                    {post.error && (
                      <p className="mt-3 text-[11px] text-rose-300 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                        {post.error}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
      </div>
    </div>
  );
}