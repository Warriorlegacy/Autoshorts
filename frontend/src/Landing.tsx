import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, TrendingUp, Video, Clock, Shield, ChevronRight, Play, Star, Users } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

const ParticleBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

const FloatingCard = ({ icon: Icon, title, delay }: { icon: any; title: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    className="absolute glass-strong rounded-2xl p-4 flex items-center gap-3 shadow-glow"
    style={{
      animation: `float 6s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}
  >
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-sm font-medium text-white/90">{title}</span>
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, description, gradient }: { icon: any; title: string; description: string; gradient: string }) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    className="group relative p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6 shadow-glow`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-white/60 leading-relaxed">{description}</p>
  </motion.div>
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    className="text-center"
  >
    <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">{value}</div>
    <div className="text-white/60 text-sm">{label}</div>
  </motion.div>
);

const Landing = ({ onLoginClick }: { onLoginClick: () => void }) => {
  return (
    <div className="min-h-screen bg-surface-950 overflow-hidden">
      <ParticleBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AutoShorts</span>
          </motion.div>
          
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onLoginClick}
            className="btn-secondary text-sm"
          >
            Sign In
          </motion.button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity }}
            className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent-purple/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              y: [0, -50, 0],
            }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-pink/10 rounded-full blur-[150px]"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-white/80">New: AI Video Generation</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
          >
            <span className="text-white">Create</span>
            <br />
            <span className="text-gradient-hero animate-gradient-x">Viral Videos</span>
            <br />
            <span className="text-white">on Autopilot</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            AI generates faceless videos automatically. Schedule once, 
            post everywhere. Grow while you sleep.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button onClick={onLoginClick} className="btn-primary group text-lg">
              <span className="relative z-10 flex items-center gap-2">
                Start Creating Free
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
                <Play className="w-5 h-5 fill-white text-white" />
              </div>
              <span>Watch Demo</span>
            </button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-8 text-white/40 text-sm"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>50K+ Creators</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>4.9 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Free Forever</span>
            </div>
          </motion.div>

          {/* Floating Cards */}
          <FloatingCard icon={Video} title="Video Generated!" delay={0.5} />
          <FloatingCard icon={TrendingUp} title="+2.4K Views" delay={0.7} />
          <FloatingCard icon={Zap} title="Auto-Posted" delay={0.9} />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem value="1M+" label="Videos Created" />
            <StatItem value="500M+" label="Total Views" />
            <StatItem value="50K+" label="Active Creators" />
            <StatItem value="99.9%" label="Uptime" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-primary-400 text-sm font-semibold tracking-wider uppercase mb-4 block"
            >
              Features
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              Everything you need to
              <span className="text-gradient"> go viral</span>
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Video}
              title="AI Video Generation"
              description="Create stunning faceless videos with AI. Choose from multiple niches and styles."
              gradient="from-primary-500 to-primary-600"
            />
            <FeatureCard
              icon={Clock}
              title="Smart Scheduling"
              description="Schedule posts across all platforms. Auto-post at optimal times for maximum engagement."
              gradient="from-accent-purple to-accent-pink"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Analytics Dashboard"
              description="Track views, engagement, and growth across all your connected accounts."
              gradient="from-accent-cyan to-primary-500"
            />
            <FeatureCard
              icon={Zap}
              title="One-Click Posting"
              description="Post to YouTube, Instagram, and TikTok simultaneously with a single click."
              gradient="from-accent-amber to-accent-rose"
            />
            <FeatureCard
              icon={Shield}
              title="Content Safety"
              description="AI moderation ensures your content meets platform guidelines automatically."
              gradient="from-accent-emerald to-accent-cyan"
            />
            <FeatureCard
              icon={Sparkles}
              title="Auto-Optimization"
              description="AI learns what works for your audience and optimizes future content."
              gradient="from-accent-pink to-accent-purple"
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by creators worldwide</h2>
            <p className="text-white/60">Join thousands of creators growing their audience</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Sarah Chen", role: "YouTuber", quote: "Grew from 0 to 100K in 3 months. This tool is incredible!", avatar: "SC" },
              { name: "Mike Johnson", role: "Content Creator", quote: "Saves me 10 hours per week. Best investment I've made.", avatar: "MJ" },
              { name: "Emma Davis", role: "Digital Marketer", quote: "My clients love the consistent content. Game changer!", avatar: "ED" },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-premium p-8"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-white/80 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-white/50">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-gradient p-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to go viral?
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Start creating AI-powered videos today. No credit card required.
            </p>
            <button onClick={onLoginClick} className="btn-primary text-lg">
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">AutoShorts</span>
          </div>
          <div className="text-white/40 text-sm">
            © 2025 AutoShorts. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
