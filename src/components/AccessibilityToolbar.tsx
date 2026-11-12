import React, { useState } from 'react';
import { Eye, Keyboard, HelpCircle, X, Check, Volume2, ShieldCheck } from 'lucide-react';

interface AccessibilityToolbarProps {
  highContrast: boolean;
  onToggleHighContrast: () => void;
  screenReaderSpeech: boolean;
  onToggleScreenReaderSpeech: () => void;
}

export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  highContrast,
  onToggleHighContrast,
  screenReaderSpeech,
  onToggleScreenReaderSpeech,
}) => {
  const [showKeyModal, setShowKeyModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5 text-xs select-none">
        <button
          onClick={onToggleHighContrast}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px] font-mono uppercase transition ${
            highContrast
              ? 'bg-amber-400 text-black border-amber-300 font-bold'
              : 'bg-[#0d1424] border-[#1e293b] text-slate-300 hover:text-white hover:bg-[#151f33]'
          }`}
          title="Toggle High Contrast Mode"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Contrast</span>
        </button>

        <button
          onClick={onToggleScreenReaderSpeech}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px] font-mono uppercase transition ${
            screenReaderSpeech
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
              : 'bg-[#0d1424] border-[#1e293b] text-slate-300 hover:text-white hover:bg-[#151f33]'
          }`}
          title="Toggle Auto Speech Narration on Frame Change"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Voice A11y</span>
        </button>

        <button
          onClick={() => setShowKeyModal(true)}
          className="p-1 rounded-sm bg-[#0d1424] border border-[#1e293b] text-slate-400 hover:text-white hover:bg-[#151f33] transition"
          title="Keyboard Shortcuts & Accessibility Guide"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
      </div>

      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-md bg-[#0a0f18] border border-[#1e293b] p-6 shadow-2xl flex flex-col gap-4 select-none relative">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded hover:bg-[#151f33] transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-[#1b2536] pb-3">
              <div className="w-8 h-8 rounded-sm bg-[#0b3d91]/30 text-sky-400 flex items-center justify-center border border-[#0b3d91]">
                <Keyboard className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Acoustic Navigation & Keybinds</h3>
                <span className="text-[10px] font-mono text-slate-400">NASA Section 508 Multisensory Access Standards</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0d1424] border border-[#1e293b]">
                <span className="text-slate-300 font-sans text-xs">Play / Pause Real-Time Sonification</span>
                <kbd className="px-2 py-0.5 rounded-sm bg-[#070b12] text-sky-300 font-mono text-[10px] border border-[#1e293b]">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0d1424] border border-[#1e293b]">
                <span className="text-slate-300 font-sans text-xs">Step Timeline Frame (Year)</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 rounded-sm bg-[#070b12] text-sky-300 font-mono text-[10px] border border-[#1e293b]">←</kbd>
                  <kbd className="px-2 py-0.5 rounded-sm bg-[#070b12] text-sky-300 font-mono text-[10px] border border-[#1e293b]">→</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0d1424] border border-[#1e293b]">
                <span className="text-slate-300 font-sans text-xs">Switch EIC Sensor Channel</span>
                <kbd className="px-2 py-0.5 rounded-sm bg-[#070b12] text-sky-300 font-mono text-[10px] border border-[#1e293b]">1 - 8</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0d1424] border border-[#1e293b]">
                <span className="text-slate-300 font-sans text-xs">Mute / Unmute Audio Output</span>
                <kbd className="px-2 py-0.5 rounded-sm bg-[#070b12] text-sky-300 font-mono text-[10px] border border-[#1e293b]">M</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0d1424] border border-[#1e293b]">
                <span className="text-slate-300 font-sans text-xs">EIC Science Intelligence Analyst Console</span>
                <kbd className="px-2 py-0.5 rounded-sm bg-[#070b12] text-sky-300 font-mono text-[10px] border border-[#1e293b]">C</kbd>
              </div>
            </div>

            <div className="p-3 rounded-sm bg-[#0d1424] border border-[#1e293b] text-[11px] text-slate-300 leading-relaxed font-sans">
              <strong className="text-sky-300 font-mono uppercase text-[10px] block mb-1">NASA Space Apps Multisensory Mission:</strong>
              Presenting Earth science through optical visualization alone limits who can reach it. This workstation synthesizes visual data frames into real-time multi-track Web Audio with speech synthesis to empower blind, visually impaired, and neurodivergent researchers worldwide.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

