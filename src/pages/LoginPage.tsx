import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Linkedin, Instagram, Facebook, MessageCircle, Twitter, ArrowLeft, Lock, Mail, Key } from 'lucide-react';

const PLATFORM_CONFIG: Record<string, any> = {
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: 'from-[#0A66C2] to-[#004182]' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'from-[#E1306C] to-[#833AB4]' },
  facebook: { name: 'Facebook', icon: Facebook, color: 'from-[#1877F2] to-[#0C58B8]' },
  threads: { name: 'Threads', icon: MessageCircle, color: 'from-[#000000] to-[#333333]' },
  x: { name: 'X (Twitter)', icon: Twitter, color: 'from-[#1DA1F2] to-[#0D8BD9]' }
};

export default function LoginPage() {
  const { platformId } = useParams<{ platformId: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const platform = platformId || 'linkedin';
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.linkedin;
  const Icon = config.icon;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      if (platform === 'linkedin') {
        const res = await fetch('/api/auth/url');
        if (res.ok) {
          const { url } = await res.json();
          window.open(url, 'linkedin_oauth', 'width=600,height=700');
        }
      } else {
        // Simulate login for other platforms
        await fetch('/api/auth/simulate', { method: 'POST' });
        navigate(`/${platform}`);
      }
    } catch (err) {
      console.error("Login failed", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Listen for oauth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        navigate(`/${platform}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, platform]);

  return (
    <div className={`min-h-screen flex items-center justify-center font-sans relative overflow-hidden bg-gradient-to-br ${config.color} text-white p-6`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[100px] z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 md:p-12 rounded-3xl w-full max-w-md relative z-10 shadow-2xl"
      >
        <Link to={`/${platform}`} className="absolute top-6 left-6 p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex flex-col items-center mb-8 mt-4">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${config.color} mb-6 shadow-lg`}>
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Login to {config.name}</h1>
          <p className="text-white/60 text-center text-sm">Connect your account to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">Email or Username</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-12 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-white/20"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-12 pr-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-white/20"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            className={`w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r ${config.color} hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4 shadow-lg`}
          >
            {isLoggingIn ? 'Connecting...' : (
              <>
                <Lock className="w-4 h-4" />
                Secure Login
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            By connecting, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}