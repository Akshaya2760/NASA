import React, { useState } from 'react';
import { User } from '../types';
import {
  Globe2,
  Lock,
  UserCheck,
  UserPlus,
  Shield,
  Satellite,
  Cpu,
  Music,
  Headphones,
  Check,
  ArrowRight,
  HelpCircle,
  FileText,
  Building,
  Key,
} from 'lucide-react';

interface RegistrationGatewayProps {
  onLogin: (user: User) => void;
  onOpenHowItWorks: () => void;
}

export const RegistrationGateway: React.FC<RegistrationGatewayProps> = ({
  onLogin,
  onOpenHowItWorks,
}) => {
  const [tab, setTab] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'scientist' | 'educator' | 'citizen'>('scientist');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Required field missing. Please provide name, official email, and password.');
      return;
    }

    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      role: role,
      institution: institution.trim() || 'NASA Earth Science Research Affiliate',
      avatarBg:
        role === 'admin'
          ? 'from-amber-600 to-slate-800'
          : role === 'scientist'
          ? 'from-blue-600 to-indigo-800'
          : 'from-slate-700 to-slate-900',
      savedPresets: ['Ocean Warming Pentatonic', 'Amazon Thermal Surge'],
      bookmarks: ['sea-surface-temp', 'atmospheric-co2', 'polar-ice-mass'],
    };

    onLogin(newUser);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter valid mission credentials.');
      return;
    }

    const isAdmin = email.toLowerCase().includes('admin') || email === 'admin@nasa.gov';
    const loggedUser: User = {
      id: 'usr_' + Date.now(),
      name: email.split('@')[0].toUpperCase(),
      email: email.trim(),
      role: isAdmin ? 'admin' : 'scientist',
      institution: isAdmin ? 'NASA Headquarters / EIC Mission Directorate' : 'NASA Goddard Space Flight Center',
      avatarBg: isAdmin ? 'from-amber-600 to-slate-800' : 'from-blue-600 to-indigo-800',
      savedPresets: ['Ocean Warming Pentatonic', 'Amazon Thermal Surge'],
      bookmarks: ['sea-surface-temp', 'atmospheric-co2'],
    };

    onLogin(loggedUser);
  };

  const handleFastPass = (targetRole: 'admin' | 'scientist' | 'citizen') => {
    let fastUser: User;
    if (targetRole === 'admin') {
      fastUser = {
        id: 'usr_admin_gate',
        name: 'Dr. Marcus Vance',
        email: 'admin@nasa.gov',
        role: 'admin',
        institution: 'NASA Earth Information Center / Operations Director',
        avatarBg: 'from-amber-600 to-slate-800',
        savedPresets: ['Voyager Harmonic Master', 'Cryosphere Extreme Descent'],
        bookmarks: ['polar-ice-mass', 'sea-surface-temp', 'atmospheric-co2'],
      };
    } else if (targetRole === 'scientist') {
      fastUser = {
        id: 'usr_sci_gate',
        name: 'Dr. Elena Rostova',
        email: 'elena.rostova@nasa.gov',
        role: 'scientist',
        institution: 'NASA Jet Propulsion Laboratory (JPL)',
        avatarBg: 'from-blue-600 to-indigo-800',
        savedPresets: ['OCO-2 Carbon Breathing Flux'],
        bookmarks: ['atmospheric-co2', 'vegetation-ndvi'],
      };
    } else {
      fastUser = {
        id: 'usr_cit_gate',
        name: 'Alex Rivera',
        email: 'alex.rivera@earthspace.org',
        role: 'citizen',
        institution: 'NASA Space Apps Research Network',
        avatarBg: 'from-slate-700 to-slate-900',
        savedPresets: ['Global Biosphere Harmony'],
        bookmarks: ['sea-surface-temp', 'vegetation-ndvi'],
      };
    }

    onLogin(fastUser);
  };

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-slate-100 flex flex-col justify-between select-none">
      {/* Top Institutional Header */}
      <header className="w-full border-b border-slate-800/80 bg-[#0a0e17] px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* NASA Meatball Insignia Vector */}
            <div className="w-9 h-9 rounded-full bg-[#0b3d91] flex items-center justify-center text-white font-bold text-xs tracking-widest border border-white/20 shadow-md">
              NASA
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white uppercase">
                  Earth Information Center
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400">Earth Science Division</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Multisensory Acoustic Research Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenHowItWorks}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>How It Works</span>
            </button>
            <span className="text-xs text-slate-600 font-mono">|</span>
            <span className="text-xs text-slate-400 font-mono">NASA Space Apps</span>
          </div>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 flex flex-col lg:flex-row items-stretch justify-center gap-8 my-auto">
        {/* Left Column: Mission Architecture & 4-Stage Workflow */}
        <div className="flex-1 flex flex-col justify-between gap-6 max-w-xl py-2">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
              <span>Security Classification: Authorized Public Science</span>
              <span>·</span>
              <span>EIC-2026-A</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              Translating Satellite Earth Observations into Dynamic Sonifications
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              NASA’s Earth Information Center produces multispectral visualizations of changing planetary systems. The Earth Jukebox renders this complex Earth science accessible to non-visual and multidisciplinary researchers by transducing calibrated radiometric data into real-time harmonic acoustic models.
            </p>
          </div>

          {/* 4-Stage Data Pipeline (Zero-Pill, Institutional Layout) */}
          <div className="p-4 rounded-xl bg-[#0c111c] border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                03. Architectural Pipeline: Raw Data to Sound
              </span>
              <button
                onClick={onOpenHowItWorks}
                className="text-[11px] text-sky-400 hover:underline"
              >
                Inspect Specifications
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[#07090e] border border-slate-800/80 flex items-start gap-2.5">
                <span className="font-mono text-xs font-bold text-sky-400 mt-0.5">01</span>
                <div>
                  <span className="font-medium text-white block">NASA Earth Data</span>
                  <span className="text-[11px] text-slate-400">MODIS, OCO-2, GRACE-FO, VIIRS swaths</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07090e] border border-slate-800/80 flex items-start gap-2.5">
                <span className="font-mono text-xs font-bold text-amber-400 mt-0.5">02</span>
                <div>
                  <span className="font-medium text-white block">Data Processing</span>
                  <span className="text-[11px] text-slate-400">Baseline subtraction and anomaly matrix</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07090e] border border-slate-800/80 flex items-start gap-2.5">
                <span className="font-mono text-xs font-bold text-indigo-400 mt-0.5">03</span>
                <div>
                  <span className="font-medium text-white block">Sonification Engine</span>
                  <span className="text-[11px] text-slate-400">Web Audio synthesis and harmonic pitch</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07090e] border border-slate-800/80 flex items-start gap-2.5">
                <span className="font-mono text-xs font-bold text-emerald-400 mt-0.5">04</span>
                <div>
                  <span className="font-medium text-white block">Earth Jukebox Console</span>
                  <span className="text-[11px] text-slate-400">Synchronized visual frames and audio</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between font-mono">
              <span>Standard: NASA Science Mission Directorate Open Science</span>
              <span className="text-slate-300">Level-2 Access</span>
            </div>
          </div>
        </div>

        {/* Right Column: Institutional Access & Registration Panel */}
        <div className="w-full max-w-md rounded-xl bg-[#0c111c] border border-slate-800 p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight uppercase">
                Mission Access Registration
              </h3>
              <p className="text-[11px] text-slate-400">
                Register mission profile to access real-time EIC sonification feeds
              </p>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          {/* Quick Reviewer Presets */}
          <div className="p-3 rounded-lg bg-[#07090e] border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <span>Reviewer Fast Credentials:</span>
            </span>
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleFastPass('scientist')}
                className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-sky-300 text-[11px] font-medium transition-colors"
              >
                Scientist
              </button>
              <button
                type="button"
                onClick={() => handleFastPass('citizen')}
                className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 text-[11px] font-medium transition-colors"
              >
                Explorer
              </button>
              <button
                type="button"
                onClick={() => handleFastPass('admin')}
                className="py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-amber-300 text-[11px] font-medium transition-colors"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 text-xs">
            <button
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`flex-1 py-2 font-medium transition-colors border-b-2 ${
                tab === 'register'
                  ? 'border-sky-500 text-white font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Register Profile
            </button>
            <button
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`flex-1 py-2 font-medium transition-colors border-b-2 ${
                tab === 'login'
                  ? 'border-sky-500 text-white font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {tab === 'register' ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-400">Researcher Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Maya Lin"
                  className="bg-[#07090e] border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-400">Official / Academic Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nasa.gov or academic address"
                  className="bg-[#07090e] border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-400">Mission Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="bg-[#07090e] border border-slate-800 focus:border-sky-500 rounded-lg px-2 py-2 text-white focus:outline-none transition-colors"
                  >
                    <option value="scientist">Earth Scientist</option>
                    <option value="educator">STEM Educator</option>
                    <option value="citizen">Citizen Scientist</option>
                    <option value="admin">EIC Administrator</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-400">Organization</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. NASA JPL / MIT"
                    className="bg-[#07090e] border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="bg-[#07090e] border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                className="mt-2 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Register & Enter Earth Jukebox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-400">Account Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.edu"
                  className="bg-[#07090e] border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#07090e] border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                className="mt-2 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Authenticate Credentials</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#0a0e17] px-6 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>National Aeronautics and Space Administration</span>
          <span>·</span>
          <span>Earth Information Center (EIC)</span>
        </div>
        <span className="text-[11px] text-slate-500">
          Official NASA Space Apps Challenge Project • Accessibility & Open Data
        </span>
      </footer>
    </div>
  );
};
