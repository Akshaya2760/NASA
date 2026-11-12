import React, { useState } from 'react';
import { User } from '../types';
import {
  Lock,
  UserPlus,
  LogIn,
  Mail,
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Satellite,
  Compass,
  KeyRound,
  Terminal,
  Cpu,
  Building,
} from 'lucide-react';

export type AuthMode = 'register' | 'login' | 'admin';

interface RegistrationPageProps {
  onRegisterSuccess: (user: User) => void;
  onBackToCinematic?: () => void;
  initialMode?: AuthMode;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({
  onRegisterSuccess,
  onBackToCinematic,
  initialMode = 'register',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Registration Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'scientist' | 'educator' | 'citizen' | 'admin'>('scientist');
  const [institution, setInstitution] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Admin Login Form State
  const [adminEmail, setAdminEmail] = useState('admin@nasa.gov');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Switch tabs cleanly
  const handleTabSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  };

  // 1. Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your Full Name.');
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid official or academic email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          role,
          institution: institution.trim() || 'NASA Space Apps Investigator',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed. Please check your inputs.');
      }

      setSuccessMessage('Account created securely! Redirecting to Earth Jukebox Dashboard...');

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      setTimeout(() => {
        onRegisterSuccess(data.user);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration on backend.');
      setLoading(false);
    }
  };

  // 2. Handle Normal User Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter your institutional email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      setSuccessMessage(`Welcome back, ${data.user.name}! Opening Earth Jukebox...`);

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      setTimeout(() => {
        onRegisterSuccess(data.user);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check credentials or register.');
      setLoading(false);
    }
  };

  // 3. Handle Separate Dedicated Admin Login
  const handleAdminSubmit = async (e?: React.FormEvent, isDirectBypass = false) => {
    if (e) e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      const payload: any = isDirectBypass
        ? { directAdminKey: 'NASA-EIC-MASTER-KEY', email: 'admin@nasa.gov' }
        : { email: adminEmail.trim().toLowerCase(), password: adminPassword };

      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Administrative clearance denied.');
      }

      setSuccessMessage('Administrator Clearance Verified! Initializing Mission Control...');

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      setTimeout(() => {
        onRegisterSuccess(data.user);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Admin authentication failed.');
      setLoading(false);
    }
  };

  // Quick fill helper for reviewer convenience
  const handleQuickDemoFill = (targetRole: 'scientist' | 'educator') => {
    if (targetRole === 'scientist') {
      setName('Dr. Elena Rostova');
      setEmail('elena.rostova@nasa.gov');
      setInstitution('NASA Jet Propulsion Laboratory (JPL)');
      setRole('scientist');
      setPassword('MissionControl2026!');
      setConfirmPassword('MissionControl2026!');
      setLoginEmail('elena.rostova@nasa.gov');
      setLoginPassword('MissionControl2026!');
    } else {
      setName('Prof. Julian Cruz');
      setEmail('julian.cruz@stem.edu');
      setInstitution('Multisensory STEM Accessibility Lab');
      setRole('educator');
      setPassword('SoundScience2026!');
      setConfirmPassword('SoundScience2026!');
      setLoginEmail('julian.cruz@stem.edu');
      setLoginPassword('SoundScience2026!');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050B18] text-[#EAF4FF] flex flex-col justify-between relative overflow-hidden select-none cosmic-grid">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00D4FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#287BFF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full border-b border-[#00D4FF]/15 bg-[#0A1628]/80 backdrop-blur-md px-6 py-4 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0B3D91] border border-white/20 flex items-center justify-center font-bold text-xs tracking-widest text-white shadow-md">
              NASA
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-[#00D4FF]">
                Earth Information Center (EIC)
              </span>
              <span className="text-[10px] text-[#9BB0C9] font-mono">
                Planetary Sonification Access Portal • Space Apps Challenge
              </span>
            </div>
          </div>

          {onBackToCinematic && (
            <button
              onClick={onBackToCinematic}
              className="text-xs font-mono text-[#9BB0C9] hover:text-[#00D4FF] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Cinematic Prologue</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Glassmorphism Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-auto">
        <div className={`w-full max-w-xl glass-panel rounded-2xl p-6 sm:p-9 shadow-2xl relative border transition-all duration-300 ${
          mode === 'admin'
            ? 'border-amber-500/40 glow-cyan shadow-[0_0_30px_rgba(245,158,11,0.15)]'
            : 'border-[#00D4FF]/25 glow-cyan'
        }`}>
          {/* Top Title & Subtitle */}
          <div className="flex flex-col gap-2 mb-6 text-center">
            <div className={`inline-flex items-center justify-center gap-2 mx-auto px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider border ${
              mode === 'admin'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-[#0A1628]/90 border-[#00D4FF]/30 text-[#00D4FF]'
            }`}>
              {mode === 'admin' ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restricted Directorate Mission Control</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span>Earth Science Investigator Access</span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase mt-1">
              {mode === 'register' && 'Register for Earth Jukebox'}
              {mode === 'login' && 'Investigator Sign In'}
              {mode === 'admin' && 'EIC Mission Control & Admin Login'}
            </h1>
            <p className="text-xs sm:text-sm text-[#9BB0C9] leading-relaxed max-w-md mx-auto">
              {mode === 'register' && 'Create your research account to translate NASA satellite observations into dynamic acoustic sonifications.'}
              {mode === 'login' && 'Sign in to access real-time satellite telemetry, planetary soundscapes, and AI audio guided research.'}
              {mode === 'admin' && 'Administrative clearance to manage registered users, monitor platform usage metrics, calibrate DSP parameters, and inspect error logs.'}
            </p>
          </div>

          {/* 3-Option Mode Switcher: Register | Login | Admin Login */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-[#050B18]/90 border border-[#00D4FF]/20 mb-6 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#00D4FF] text-[#050B18] font-bold shadow-md'
                  : 'text-[#9BB0C9] hover:text-white hover:bg-[#0A1628]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Register</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#287BFF] text-white font-bold shadow-md'
                  : 'text-[#9BB0C9] hover:text-white hover:bg-[#0A1628]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('admin')}
              className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/30'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Admin Login</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE 1: REGISTRATION */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span>Full Name</span>
                  <span className="text-[#00D4FF]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Maya Lin / Researcher Name"
                  className="w-full bg-[#0A1628]/90 border border-[#00D4FF]/20 focus:border-[#00D4FF] rounded-xl px-4 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-all duration-200"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span>Email Address</span>
                  <span className="text-[#00D4FF]">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator@nasa.gov or user@institution.edu"
                  className="w-full bg-[#0A1628]/90 border border-[#00D4FF]/20 focus:border-[#00D4FF] rounded-xl px-4 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-all duration-200 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9]">
                    Clearance Classification
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-[#0A1628]/90 border border-[#00D4FF]/20 focus:border-[#00D4FF] rounded-xl px-3 py-2.5 text-[#EAF4FF] focus:outline-none transition-all duration-200 text-xs"
                  >
                    <option value="scientist">Earth Scientist / Co-Investigator</option>
                    <option value="educator">Acoustics & STEM Educator</option>
                    <option value="citizen">Public Citizen Explorer</option>
                    <option value="admin">EIC Lab Administrator</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9]">
                    Institution / Affiliate
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. JPL / MIT / Independent"
                    className="w-full bg-[#0A1628]/90 border border-[#00D4FF]/20 focus:border-[#00D4FF] rounded-xl px-3 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-all duration-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Password</span>
                    <span className="text-[#00D4FF]">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#0A1628]/90 border border-[#00D4FF]/20 focus:border-[#00D4FF] rounded-xl px-4 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-all duration-200 font-mono"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Confirm Password</span>
                    <span className="text-[#00D4FF]">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-[#0A1628]/90 border border-[#00D4FF]/20 focus:border-[#00D4FF] rounded-xl px-4 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-all duration-200 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-[#050B18] bg-[#00D4FF] hover:bg-[#287BFF] hover:text-white transition-all duration-200 shadow-[0_0_20px_rgba(0,212,255,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Provisioning Investigator Access...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register & Open Earth Jukebox</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-[#9BB0C9]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('login')}
                    className="text-[#00D4FF] hover:underline font-mono font-bold cursor-pointer"
                  >
                    Sign In
                  </button>
                  {' • '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('admin')}
                    className="text-amber-400 hover:underline font-mono cursor-pointer"
                  >
                    Admin Access
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* MODE 2: REGULAR LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#287BFF]" />
                  <span>Email Address</span>
                  <span className="text-[#287BFF]">*</span>
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="investigator@nasa.gov or your registered email"
                  className="w-full bg-[#0A1628]/90 border border-[#287BFF]/30 focus:border-[#287BFF] rounded-xl px-4 py-3 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-all duration-200 font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#9BB0C9] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#287BFF]" />
                  <span>Security Password</span>
                  <span className="text-[#287BFF]">*</span>
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#0A1628]/90 border border-[#287BFF]/30 focus:border-[#287BFF] rounded-xl px-4 py-3 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-all duration-200 font-mono"
                  required
                />
              </div>

              {/* Demo Fill Helper */}
              <div className="p-3 rounded-xl bg-[#0A1628]/70 border border-[#00D4FF]/15 flex items-center justify-between text-[11px]">
                <span className="text-[#9BB0C9] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span>Need quick reviewer credentials?</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('scientist')}
                    className="px-2.5 py-1 rounded-md bg-[#101F35] border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF] hover:text-[#050B18] font-mono text-[10px] transition-all cursor-pointer"
                  >
                    JPL Scientist
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('educator')}
                    className="px-2.5 py-1 rounded-md bg-[#101F35] border border-[#287BFF]/30 text-[#287BFF] hover:bg-[#287BFF] hover:text-white font-mono text-[10px] transition-all cursor-pointer"
                  >
                    STEM Educator
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-white bg-[#287BFF] hover:bg-[#00D4FF] hover:text-[#050B18] transition-all duration-200 shadow-[0_0_20px_rgba(40,123,255,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In & Open Earth Jukebox</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-[#9BB0C9]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('register')}
                    className="text-[#00D4FF] hover:underline font-mono font-bold cursor-pointer"
                  >
                    Register Here
                  </button>
                  {' • '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('admin')}
                    className="text-amber-400 hover:underline font-mono cursor-pointer"
                  >
                    Admin Portal
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* MODE 3: SEPARATE DEDICATED ADMIN LOGIN */}
          {mode === 'admin' && (
            <form onSubmit={(e) => handleAdminSubmit(e, false)} className="flex flex-col gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200/90 flex flex-col gap-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold font-mono text-amber-300 uppercase text-[11px]">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>NASA Earth Information Center • Directorate Console</span>
                </div>
                <p className="text-[11px] text-amber-200/70">
                  Administrative access enables managing registered users, monitoring platform engagement metrics, modifying scientific datasets, and reviewing operational error logs.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Administrator Email</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@nasa.gov"
                  className="w-full bg-[#0A1628]/90 border border-amber-500/30 focus:border-amber-400 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-all duration-200 font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Security Passcode</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full bg-[#0A1628]/90 border border-amber-500/30 focus:border-amber-400 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-all duration-200 font-mono"
                  required
                />
              </div>

              {/* 1-Click Fast Access Mission Control Button */}
              <button
                type="button"
                onClick={() => handleAdminSubmit(undefined, true)}
                className="py-2.5 px-3 rounded-xl bg-amber-950/50 border border-amber-500/50 hover:bg-amber-900/60 text-amber-300 font-mono text-[11px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>1-Click Launch: Mission Control (Director Vance)</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all duration-200 shadow-[0_0_20px_rgba(251,191,36,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Level-5 Authorization...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Authenticate Admin Clearance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-[#9BB0C9]">
                  Standard user?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('login')}
                    className="text-[#287BFF] hover:underline font-mono font-bold cursor-pointer"
                  >
                    User Login
                  </button>
                  {' • '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('register')}
                    className="text-[#00D4FF] hover:underline font-mono cursor-pointer"
                  >
                    Register New Account
                  </button>
                </span>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#00D4FF]/15 bg-[#0A1628]/80 px-6 py-3 text-center text-xs text-[#9BB0C9] z-10 font-mono text-[11px]">
        <span>NASA Earth Information Center (EIC) • Earth Jukebox Sonification Lab • NASA Space Apps Challenge</span>
      </footer>
    </div>
  );
};
