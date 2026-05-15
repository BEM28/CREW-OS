import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase/client';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Shield, Layers, Zap } from 'lucide-react';

export default function Landing() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background patterns */}
      <div className="absolute inset-0 pattern-grid-lg text-white/[0.02] bg-[size:64px_64px] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-[72px] glass-panel z-50 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">CREW OS</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
          <a href="#product" className="hover:text-text-primary transition-colors">Product</a>
          <a href="#workflow" className="hover:text-text-primary transition-colors">Workflow</a>
          <a href="#security" className="hover:text-text-primary transition-colors">Security</a>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogin}
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Sign in
          </button>
          <button 
            onClick={handleLogin}
            className="bg-text-primary text-background px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-full hover:bg-white/90 transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pt-32 px-4 sm:px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-4xl mx-auto mt-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-white/[0.02] mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-text-secondary tracking-wide uppercase">Your AI Dream Team, For Any Industry</span>
          </div>
          
          <h1 className="text-[40px] leading-[1.1] sm:text-[64px] font-bold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 mb-6">
            Build your AI company <br className="hidden sm:block" /> in minutes.
          </h1>
          
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Create a persistent crew of AI specialists that can plan, debate, execute, and remember every project inside a premium digital workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={handleLogin}
              className="w-full sm:w-auto h-12 px-8 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(124,58,237,0.3)]"
            >
              Build Your Crew
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-32 mb-20 w-full">
          {[
            { icon: Layers, title: "Persistent Memory", text: "Every project context is saved forever. Pick up exactly where you left off." },
            { icon: Zap, title: "Multi-Agent Debates", text: "Watch agents push back, ask questions, and refine ideas dynamically." },
            { icon: Shield, title: "Enterprise Grade", text: "AES-256-GCM encryption ensures your API keys and data never leak." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + (i * 0.1) }}
              className="glass-panel p-8 rounded-[24px] hover-card premium-shadow"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-6 border border-primary/20">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">{feature.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
