import React, { useState, useRef, useEffect } from 'react';
import { EICDataset, DatasetFrame, ChatMessage, SonificationAudioState } from '../types';
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  Volume2,
  Terminal,
  Activity,
  FileText,
  Sliders,
} from 'lucide-react';

interface AeroSonicChatbotProps {
  dataset: EICDataset;
  currentFrame: DatasetFrame;
  audioState: SonificationAudioState;
  isOpen: boolean;
  onClose: () => void;
}

export const AeroSonicChatbot: React.FC<AeroSonicChatbotProps> = ({
  dataset,
  currentFrame,
  audioState,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `EIC Acoustic Science Console initialized. Active telemetry channel: ${dataset.title} (${currentFrame.label}). Fundamental pitch carrier: ${currentFrame.audioPitchHz.toFixed(1)} Hz (${currentFrame.musicalNote}).\n\nSubmit inquiries regarding planetary acoustic mappings, radiometric anomaly extractions, or request screen-reader sensory descriptions.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            datasetName: dataset.title,
            year: currentFrame.year,
            currentValue: `${currentFrame.globalAvg} ${dataset.unit}`,
            anomaly: currentFrame.anomaly,
            pitchHz: currentFrame.audioPitchHz,
            musicalNote: currentFrame.musicalNote,
            scale: audioState.activeScale,
            mission: dataset.missionSensor,
            daac: dataset.nasaDaac,
            productId: dataset.nasaProductId,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: data.response || 'No operational record returned for the specified parameters.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        simulated: data.simulated,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('EIC intelligence inquiry error:', err);
      const fallbackMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Analysis for ${dataset.title} (${currentFrame.label}): Registered metric is ${currentFrame.globalAvg} ${dataset.unit} with anomaly deviation of ${currentFrame.anomaly > 0 ? '+' : ''}${currentFrame.anomaly}. The Web Audio DSP maps this state to ${currentFrame.audioPitchHz.toFixed(1)} Hz in ${audioState.activeScale.toUpperCase()} scale.\n\nScientific note: ${currentFrame.scientificSummary}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakMessage = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-full sm:w-[440px] rounded-2xl bg-[#0A1628] border border-[#00D4FF]/30 shadow-2xl flex flex-col transition-all duration-200 select-none glass-panel ${
        isMinimized ? 'h-12' : 'h-[580px]'
      }`}
    >
      {/* Console Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#00D4FF]/20 bg-[#101F35] rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00D4FF]" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-[#EAF4FF] uppercase tracking-wider">
                EIC Science Intelligence Console
              </span>
              <span className="text-[10px] font-mono text-[#00D4FF] bg-[#050B18] px-1.5 py-0.2 rounded">v3.8</span>
            </div>
            <span className="text-[10px] text-[#9BB0C9] font-mono">
              Spectrogram & Telemetry Analyst
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:text-white hover:bg-slate-800 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Active Sensor Status Strip */}
          <div className="px-4 py-1.5 bg-[#06080e] border-b border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-medium truncate max-w-[210px]">{dataset.title}</span>
              <span>·</span>
              <span className="text-sky-400">{currentFrame.year}</span>
            </div>
            <span className="text-slate-500 font-mono">{currentFrame.audioPitchHz.toFixed(1)} Hz</span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs font-sans">
            {messages.map((m) => {
              const isBot = m.sender === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col gap-1 ${isBot ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 px-1">
                    <span>{isBot ? 'NASA EIC Intelligence' : 'Researcher'}</span>
                    <span>·</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-3 rounded-lg leading-relaxed whitespace-pre-wrap max-w-[92%] border ${
                      isBot
                        ? 'bg-[#0e1320] border-slate-800 text-slate-200'
                        : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  >
                    {m.text}
                  </div>

                  {isBot && (
                    <button
                      onClick={() => speakMessage(m.text)}
                      className="text-[10px] font-mono text-slate-500 hover:text-sky-400 flex items-center gap-1 transition-colors px-1 mt-0.5"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Audio Narration</span>
                    </button>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-3 bg-[#0e1320] rounded-lg border border-slate-800 w-fit font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Querying NASA Earth Science observation model...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Technical Inquiry Chips */}
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-[#00D4FF]/15 bg-[#050B18] no-scrollbar">
            <button
              onClick={() =>
                handleSendMessage('What real-time natural events is NASA currently tracking on Earth, and how do they sound?')
              }
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#101F35] hover:bg-[#00D4FF]/20 border border-[#00D4FF]/30 text-[11px] font-mono text-[#00D4FF] hover:text-white transition-colors flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>Current Live Events</span>
            </button>
            <button
              onClick={() =>
                handleSendMessage('Compare the sound of previous historical baseline years with our current observation year.')
              }
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#101F35] hover:bg-[#287BFF]/20 border border-[#00D4FF]/20 text-[11px] font-mono text-[#EAF4FF] hover:text-[#00D4FF] transition-colors flex items-center gap-1"
            >
              <span>⏮️ Compare Previous Years Sound</span>
            </button>
            <button
              onClick={() =>
                handleSendMessage('Explain why this particular anomaly generates these acoustic frequencies.')
              }
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#101F35] hover:bg-[#287BFF]/20 border border-[#00D4FF]/20 text-[11px] font-mono text-[#9BB0C9] hover:text-[#EAF4FF] transition-colors"
            >
              Frequency Rationale
            </button>
            <button
              onClick={() =>
                handleSendMessage('Provide a sensory description of this frame for blind and visually impaired researchers.')
              }
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#101F35] hover:bg-[#287BFF]/20 border border-[#00D4FF]/20 text-[11px] font-mono text-[#9BB0C9] hover:text-[#EAF4FF] transition-colors"
            >
              Sensory Audio Description
            </button>
            <button
              onClick={() =>
                handleSendMessage(`Detail the scientific data acquisition of ${dataset.missionSensor}.`)
              }
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#101F35] hover:bg-[#287BFF]/20 border border-[#00D4FF]/20 text-[11px] font-mono text-[#9BB0C9] hover:text-[#EAF4FF] transition-colors"
            >
              Sensor Pipeline
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-[#00D4FF]/15 bg-[#0A1628] rounded-b-2xl flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Query current NASA events, frequencies, or sound science..."
              className="flex-1 bg-[#050B18] border border-[#00D4FF]/25 focus:border-[#00D4FF] rounded-xl px-3 py-2 text-xs text-[#EAF4FF] placeholder-[#9BB0C9]/40 focus:outline-none transition-colors font-mono"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2 rounded-xl bg-[#00D4FF] hover:bg-[#287BFF] hover:text-white disabled:opacity-40 text-[#050B18] font-bold transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-[0_0_12px_rgba(0,212,255,0.3)]"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
