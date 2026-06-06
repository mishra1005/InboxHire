'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.2 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

export default function LandingPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    // Parse query params for errors
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      if (err === 'auth_failed') {
        setErrorMsg('Authentication failed. Please verify your Google account.');
      } else if (err.includes('oauth') || err.includes('credential') || err.includes('redirect_uri') || err === 'missing_code') {
        setErrorMsg('Google OAuth Credentials are not configured in your environment. Try Demo Mode below!');
      } else {
        setErrorMsg(`An error occurred: ${decodeURIComponent(err)}`);
      }
    }
  }, []);

  const handleLaunchDemo = async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/dashboard?demo=true';
      } else {
        setErrorMsg('Failed to initialize demo session.');
        setLoadingDemo(false);
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to connect to demo service.');
      setLoadingDemo(false);
    }
  };

  const statusChips = [
    { text: 'Applied', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]', x: '10%', y: '20%', delay: 0 },
    { text: 'Replied', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]', x: '85%', y: '25%', delay: 1 },
    { text: 'Interview', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]', x: '75%', y: '70%', delay: 2 },
    { text: 'Follow Up Required', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]', x: '15%', y: '65%', delay: 1.5 },
  ];

  return (
    <div className="dark bg-zinc-950 text-zinc-100 min-h-screen relative overflow-hidden flex flex-col justify-between font-sans dot-grid">
      {/* Background radial gradient glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            InboxHire
          </span>
        </div>

        <button
          onClick={handleLaunchDemo}
          disabled={loadingDemo}
          className="text-sm font-medium text-zinc-400 hover:text-white transition-colors bg-zinc-900/60 border border-zinc-800/80 px-4 py-2 rounded-xl backdrop-blur-md cursor-pointer"
        >
          {loadingDemo ? 'Loading...' : 'Try Demo Mode'}
        </button>
      </header>

      {/* Floating Status Chips (Animated Background Elements) */}
      <div className="absolute inset-0 pointer-events-none hidden md:block overflow-hidden">
        {statusChips.map((chip, idx) => (
          <motion.div
            key={idx}
            className={`absolute px-4 py-2 border rounded-full text-sm font-medium backdrop-blur-sm ${chip.color}`}
            style={{ left: chip.x, top: chip.y }}
            animate={{
              y: [0, -12, 0],
              rotate: [0, idx % 2 === 0 ? 3 : -3, 0],
            }}
            transition={{
              duration: 5 + idx,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: chip.delay,
            }}
          >
            {chip.text}
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-grow flex flex-col justify-center items-center px-6 py-12 text-center max-w-4xl mx-auto z-10">
        {/* Error notification */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center space-x-3 bg-red-500/10 border border-red-500/25 px-5 py-3.5 rounded-2xl text-red-300 text-sm max-w-lg text-left"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {/* Feature badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-300 mb-6 backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intelligent Gmail Job CRM</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl leading-tight tracking-tight mb-6"
        >
          Track every application. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Never lose an opportunity.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-xl text-zinc-400 font-normal leading-relaxed max-w-2xl mb-10"
        >
          InboxHire automatically turns your Gmail into a job search CRM. Sync sent messages, detect recruiter replies, and automate follow-ups.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          {/* Main Google Login Link */}
          <a
            href="/api/auth/google"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-3 bg-white text-zinc-950 font-semibold px-8 py-4 rounded-2xl shadow-xl shadow-white/5 hover:bg-zinc-100 active:scale-98 transition-all glow-btn cursor-pointer"
          >
            <span>Connect Gmail</span>
            <ArrowRight className="w-5 h-5" />
          </a>

          {/* Demo Button */}
          <button
            onClick={handleLaunchDemo}
            disabled={loadingDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold px-8 py-4 rounded-2xl hover:text-white hover:border-zinc-700 active:scale-98 transition-all backdrop-blur-md cursor-pointer"
          >
            <span>{loadingDemo ? 'Launching...' : 'Try Demo Version (Instant)'}</span>
          </button>
        </motion.div>

        {/* Key Features List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-left border-t border-zinc-900 pt-8 w-full"
        >
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-sm text-zinc-200">Gmail Auto-Sync</h3>
            <p className="text-xs text-zinc-500">Fetches sent and received emails automatically.</p>
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-sm text-zinc-200">Rule-Based Detection</h3>
            <p className="text-xs text-zinc-500">Flags threads with keywords like role, hiring, etc.</p>
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-sm text-zinc-200">Reply & Status Tracking</h3>
            <p className="text-xs text-zinc-500">Detects if a company replied or offered interviews.</p>
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-sm text-zinc-200">Follow-Up Reminders</h3>
            <p className="text-xs text-zinc-500">Auto-alerts for 3, 7, and 14 days of no reply.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center border-t border-zinc-900/60 text-zinc-500 text-sm z-10 gap-4">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
          <span>© {new Date().getFullYear()} InboxHire. All rights reserved. Your Gmail search CRM.</span>
          <span className="hidden md:inline text-zinc-800">•</span>
          <a href="/privacy" className="hover:text-zinc-300 transition-colors underline underline-offset-4 decoration-zinc-800">
            Privacy Policy
          </a>
        </div>

        <div className="flex items-center space-x-6">
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">
            <LinkedinIcon className="w-4 h-4" />
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">
            <GithubIcon className="w-4 h-4" />
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">
            <TwitterIcon className="w-4 h-4" />
          </a>
          <a href="mailto:support@inboxhire.com" className="hover:text-zinc-300 transition-colors">
            <Mail className="w-4 h-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
