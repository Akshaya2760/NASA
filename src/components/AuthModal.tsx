import React, { useState } from 'react';
import { User } from '../types';
import {
  LogIn,
  UserPlus,
  Shield,
  ShieldAlert,
  Check,
  X,
  Key,
  Mail,
  Lock,
  Building,
  Terminal,
  Cpu,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  onLogout: () => void;
  initialTab?: 'login' | 'register' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onLogin,
  onLogout,
  initialTab = 'login',
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'admin'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'scientist' | 'educator' | 'citizen'>('scientist');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin login states
  const [adminEmail, setAdminEmail] = useState('admin@nasa.gov');
  const [adminPassword, setAdminPassword] = useState('admin123');

  if (!isOpen) return null;

  // 1. Regular User Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide institutional email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      onLogin(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Register Investigator
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please complete all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword: password,
          role,
          institution: institution.trim() || 'NASA Space Apps Investigator',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      onLogin(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Admin Login
  const handleAdminSubmit = async (e?: React.FormEvent, isDirectBypass = false) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = isDirectBypass
        ? { directAdminKey: 'NASA-EIC-MASTER-KEY', email: 'admin@nasa.gov' }
        : { email: adminEmail.trim().toLowerCase(), password: adminPassword };

      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin clearance rejected.');

      if (data.token) {
        localStorage.setItem('nasa_eic_auth_token', data.token);
      }
      localStorage.setItem('nasa_eic_user', JSON.stringify(data.user));

      onLogin(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (presetRole: 'admin' | 'scientist' | 'educator') => {
    if (presetRole === 'admin') {
      handleAdminSubmit(undefined, true);
    } else if (presetRole === 'scientist') {
      setEmail('elena.rostova@nasa.gov');
      setPassword('MissionControl2026!');
      setName('Dr. Elena Rostova');
      setInstitution('NASA Jet Propulsion Laboratory (JPL)');
      setRole('scientist');
    } else {
      setEmail('julian.cruz@stem.edu');
      setPassword('SoundScience2026!');
      setName('Prof. Julian Cruz');
      setInstitution('Multisensory STEM Accessibility Lab');
      setRole('educator');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0a0f18] border border-[#1e293b] p-6 shadow-2xl flex flex-col gap-5 select-none relative rounded-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded hover:bg-[#131d2e] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-1.5 border-b border-[#1b2536] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0b3d91]/30 border border-[#0b3d91] flex items-center justify-center text-sky-400 rounded-sm">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs tracking-wider text-sky-400 font-bold uppercase">NASA Earth Science</span>
                <span className="text-[10px] font-mono text-slate-500">SEC-AUTH-2026</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                Earth Jukebox Access Gateway
              </h2>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Authentication required for NASA satellite data streaming, sonification frequency curves, and mission control tools.
          </p>
        </div>

        {/* If already logged in, show user profile card */}
        {currentUser ? (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 bg-[#0f172a] border border-[#1e293b] rounded-xl flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-tr ${currentUser.avatarBg} flex items-center justify-center text-white font-mono font-bold text-sm border border-slate-700`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-xs">{currentUser.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-950 text-sky-300 border border-sky-800 uppercase">
                    {currentUser.role}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{currentUser.email}</span>
                <span className="text-[10px] text-slate-500">{currentUser.institution}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onLogout}
                className="flex-1 py-2 rounded-xl bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/50 text-rose-300 font-mono text-xs transition cursor-pointer"
              >
                SIGN OUT
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-[#0b3d91] hover:bg-blue-700 text-white font-mono text-xs transition cursor-pointer"
              >
                RESUME SESSION
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 3-Option Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0d1424] border border-[#1e293b] text-xs font-mono">
              <button
                onClick={() => {
                  setTab('register');
                  setError('');
                }}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                  tab === 'register'
                    ? 'bg-[#00D4FF] text-[#050B18] font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3 h-3" />
                <span>Register</span>
              </button>

              <button
                onClick={() => {
                  setTab('login');
                  setError('');
                }}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                  tab === 'login'
                    ? 'bg-[#287BFF] text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3 h-3" />
                <span>Login</span>
              </button>

              <button
                onClick={() => {
                  setTab('admin');
                  setError('');
                }}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                  tab === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-[11px] font-mono">
                {error}
              </div>
            )}

            {/* TAB 1: LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Institutional Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="investigator@nasa.gov or email"
                      className="w-full bg-[#0d1424] border border-[#1e293b] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Security Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0d1424] border border-[#1e293b] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Fast Reviewer Presets:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDemoLogin('scientist')}
                      className="px-2 py-0.5 rounded bg-[#131d2e] text-sky-400 hover:bg-sky-950 font-mono"
                    >
                      JPL Scientist
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoLogin('educator')}
                      className="px-2 py-0.5 rounded bg-[#131d2e] text-emerald-400 hover:bg-emerald-950 font-mono"
                    >
                      STEM
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 py-2.5 rounded-xl bg-[#287BFF] hover:bg-blue-600 text-white font-mono text-xs font-semibold tracking-wider uppercase transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{loading ? 'Authenticating...' : 'Sign In To Dashboard'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Maya Lin"
                    className="w-full bg-[#0d1424] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="investigator@nasa.gov or academic"
                    className="w-full bg-[#0d1424] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Clearance</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-[#0d1424] border border-[#1e293b] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="scientist">Scientist</option>
                      <option value="educator">Educator</option>
                      <option value="citizen">Citizen</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Institution</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. JPL / MIT"
                      className="w-full bg-[#0d1424] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Security Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#0d1424] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 py-2.5 rounded-xl bg-[#00D4FF] hover:bg-sky-400 text-slate-950 font-mono text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{loading ? 'Registering...' : 'Register Investigator'}</span>
                </button>
              </form>
            )}

            {/* TAB 3: SEPARATE ADMIN LOGIN */}
            {tab === 'admin' && (
              <form onSubmit={(e) => handleAdminSubmit(e, false)} className="flex flex-col gap-3">
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                  <span className="font-bold font-mono text-amber-300">Level-5 Mission Control Access:</span> Manage registered users, monitor platform usage analytics, calibrate DSP, and inspect error logs.
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Administrator Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@nasa.gov"
                    className="w-full bg-[#0d1424] border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Admin Passcode</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="admin123"
                    className="w-full bg-[#0d1424] border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleAdminSubmit(undefined, true)}
                  className="py-1.5 px-2 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60 font-mono text-[10px] uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Cpu className="w-3 h-3 text-amber-400" />
                  <span>1-Click Launch Mission Control (Director Vance)</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{loading ? 'Authorizing...' : 'Authorize Admin Access'}</span>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
