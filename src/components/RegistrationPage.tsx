import React, { useState } from 'react';
import { User } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import {
  Lock,
  UserPlus,
  LogIn,
  Mail,
  User as UserIcon,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Compass,
  KeyRound,
  Volume2,
  VolumeX,
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
  const [audioFeedback, setAudioFeedback] = useState(true);

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

  const playTypingFeedback = (val: string) => {
    if (audioFeedback && val.length > 0) {
      audioEngine.playKeystrokeTone(val.charCodeAt(val.length - 1));
    }
  };

  const announceEntry = (userName: string) => {
    if (!audioFeedback) return;
    audioEngine.playEntranceChime('dashboard');
    audioEngine.speakWelcomeMessage(
      `Welcome, ${userName}, to NASA Earth Jukebox. All satellite channels are ready.`
    );
  };

  const handleTabSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    if (audioFeedback) {
      audioEngine.playKeystrokeTone(newMode === 'register' ? 1 : newMode === 'login' ? 3 : 5);
    }
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

      setSuccessMessage(`Welcome to Earth Jukebox, ${data.user.name}. Entering Observatory...`);
      announceEntry(data.user.name);

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      setTimeout(() => {
        onRegisterSuccess(data.user);
      }, 750);
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

      setSuccessMessage(`Welcome back, ${data.user.name}. Entering Earth Jukebox...`);
      announceEntry(data.user.name);

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      setTimeout(() => {
        onRegisterSuccess(data.user);
      }, 750);
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

      setSuccessMessage('Administrator Clearance Verified. Entering Mission Control...');
      announceEntry(data.user.name);

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      setTimeout(() => {
        onRegisterSuccess(data.user);
      }, 750);
    } catch (err: any) {
      setError(err?.message || 'Admin authentication failed.');
      setLoading(false);
    }
  };

  // Quick fill helper for reviewer convenience
  const handleQuickDemoFill = (targetRole: 'scientist' | 'educator') => {
    if (audioFeedback) audioEngine.playKeystrokeTone(4);
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

  const activeVisitorName =
    mode === 'register' && name.trim()
      ? name.trim()
      : mode === 'login' && loginEmail.includes('@')
      ? loginEmail.split('@')[0]
      : '';

  return (
    <div className="min-h-screen w-full bg-[#050B18] text-[#EAF4FF] flex flex-col justify-between select-none">
      {/* Clean Single-Row Top Header */}
      <header className="w-full border-b border-[#1B2B44] bg-[#070D19] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0B3D91] border border-white/20 flex items-center justify-center font-bold text-[11px] tracking-widest text-white">
              NASA
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">
              Earth Jukebox Access Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                const next = !audioFeedback;
                setAudioFeedback(next);
                if (next) {
                  audioEngine.playKeystrokeTone(2);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-[#9BB0C9] hover:text-white transition-colors cursor-pointer"
              title="Toggle acoustic keystroke and welcome sounds"
            >
              {audioFeedback ? (
                <>
                  <Volume2 className="w-4 h-4 text-[#00D4FF]" />
                  <span>Portal Audio: On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-[#9BB0C9]" />
                  <span>Portal Audio: Muted</span>
                </>
              )}
            </button>

            {onBackToCinematic && (
              <button
                onClick={onBackToCinematic}
                className="text-xs font-medium text-[#9BB0C9] hover:text-[#00D4FF] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Opening View</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Clean Form Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className="w-full max-w-lg rounded-xl bg-[#0A1628] border border-[#1B2B44] p-6 sm:p-8 shadow-xl">
          {/* Dynamic Greeting Header */}
          <div className="flex flex-col gap-1.5 mb-6">
            <p className="text-xs font-mono text-[#00D4FF]">
              {activeVisitorName
                ? `Welcome to NASA Earth Jukebox, ${activeVisitorName}`
                : 'Stage 01 · Investigator Access & Clearance'}
            </p>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              {mode === 'register' && 'Create Research Account'}
              {mode === 'login' && 'Investigator Sign In'}
              {mode === 'admin' && 'Mission Control Admin Login'}
            </h1>
            <p className="text-xs text-[#9BB0C9] leading-relaxed">
              {mode === 'register' &&
                'Register with your name, email, and password to explore live NASA satellite data and audio sonifications.'}
              {mode === 'login' &&
                'Sign in to resume satellite observation playback, coordinate probing, and spectrogram analysis.'}
              {mode === 'admin' &&
                'Separate administrative portal to manage registered users, monitor platform usage, and inspect activity logs.'}
            </p>
          </div>

          {/* 3-Option Segmented Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#050B18] border border-[#1B2B44] mb-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              className={`py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#00D4FF] text-[#050B18] font-semibold'
                  : 'text-[#9BB0C9] hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Register</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#287BFF] text-white font-semibold'
                  : 'text-[#9BB0C9] hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('admin')}
              className={`py-2 px-2 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Admin Login</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE 1: REGISTRATION */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#9BB0C9] flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    playTypingFeedback(e.target.value);
                  }}
                  placeholder="Dr. Maya Lin"
                  className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#00D4FF] rounded-lg px-3.5 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#9BB0C9] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#00D4FF]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    playTypingFeedback(e.target.value);
                  }}
                  placeholder="investigator@nasa.gov"
                  className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#00D4FF] rounded-lg px-3.5 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#9BB0C9]">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#00D4FF] rounded-lg px-3 py-2.5 text-[#EAF4FF] focus:outline-none transition-colors text-xs"
                  >
                    <option value="scientist">Earth Scientist</option>
                    <option value="educator">STEM Educator</option>
                    <option value="citizen">Public Explorer</option>
                    <option value="admin">EIC Administrator</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#9BB0C9]">Institution</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => {
                      setInstitution(e.target.value);
                      playTypingFeedback(e.target.value);
                    }}
                    placeholder="JPL / University"
                    className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#00D4FF] rounded-lg px-3 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#9BB0C9] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      playTypingFeedback(e.target.value);
                    }}
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#00D4FF] rounded-lg px-3.5 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors font-mono"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#9BB0C9] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Confirm Password</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      playTypingFeedback(e.target.value);
                    }}
                    placeholder="Re-enter password"
                    className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#00D4FF] rounded-lg px-3.5 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 rounded-lg text-xs font-semibold text-[#050B18] bg-[#00D4FF] hover:bg-[#38BDF8] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Provisioning Account...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register & Enter Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 2: REGULAR LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#9BB0C9] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#287BFF]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    playTypingFeedback(e.target.value);
                  }}
                  placeholder="investigator@nasa.gov"
                  className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#287BFF] rounded-lg px-3.5 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#9BB0C9] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#287BFF]" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    playTypingFeedback(e.target.value);
                  }}
                  placeholder="Enter your password"
                  className="w-full bg-[#050B18] border border-[#1E3354] focus:border-[#287BFF] rounded-lg px-3.5 py-2.5 text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#9BB0C9] pt-1">
                <span>Quick Fill:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('scientist')}
                    className="px-2.5 py-1 rounded bg-[#050B18] border border-[#1E3354] text-[#00D4FF] hover:border-[#00D4FF] font-mono text-[10px] transition-colors cursor-pointer"
                  >
                    JPL Scientist
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('educator')}
                    className="px-2.5 py-1 rounded bg-[#050B18] border border-[#1E3354] text-[#287BFF] hover:border-[#287BFF] font-mono text-[10px] transition-colors cursor-pointer"
                  >
                    STEM Educator
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-3 rounded-lg text-xs font-semibold text-white bg-[#287BFF] hover:bg-[#3B82F6] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In & Enter Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 3: SEPARATE DEDICATED ADMIN LOGIN */}
          {mode === 'admin' && (
            <form onSubmit={(e) => handleAdminSubmit(e, false)} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Administrator Email</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    playTypingFeedback(e.target.value);
                  }}
                  placeholder="admin@nasa.gov"
                  className="w-full bg-[#050B18] border border-amber-500/30 focus:border-amber-400 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Passcode</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    playTypingFeedback(e.target.value);
                  }}
                  placeholder="admin123"
                  className="w-full bg-[#050B18] border border-amber-500/30 focus:border-amber-400 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => handleAdminSubmit(undefined, true)}
                className="py-2.5 px-3 rounded-lg bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/50 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Quick Launch: Director Marcus Vance (Admin)
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Verifying Authorization...</span>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Sign In to Mission Control</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="w-full border-t border-[#1B2B44] bg-[#070D19] px-6 py-3 text-center text-[11px] text-[#9BB0C9]">
        NASA Earth Information Center · Earth Jukebox Sonification Lab
      </footer>
    </div>
  );
};
