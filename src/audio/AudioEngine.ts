import { MusicalScale, SonificationAudioState } from '../types';

// Scale intervals in semitones relative to root
const SCALE_INTERVALS: Record<MusicalScale, number[]> = {
  pentatonic: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24], // Major Pentatonic
  voyager: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24],    // Minor Pentatonic / Golden Record
  dorian: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19],  // Oceanic Dorian
  lydian: [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19],  // Atmospheric Lydian
  minor: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19],   // Aeolian Natural Minor
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
};

const NOTE_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  public analyser: AnalyserNode | null = null;

  // Drone Nodes
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  // Lead / Melody Nodes
  private leadOsc: OscillatorNode | null = null;
  private leadGain: GainNode | null = null;
  private leadFilter: BiquadFilterNode | null = null;
  private leadPanner: StereoPannerNode | null = null;

  // Atmosphere / Noise Nodes
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  // Pulse LFO
  private pulseTimer: number | null = null;

  // Audio Recording
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private isInitialized = false;
  private currentFrequency = 146.83;

  constructor() {
    // AudioContext will be initialized on user interaction to comply with browser autoplay policies
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      console.warn('Web Audio API not supported in this browser.');
      return;
    }

    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Master Compressor
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Analyser Node for Visualizers
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;

    // Connect Master Chain
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Recording Destination
    this.mediaDest = this.ctx.createMediaStreamDestination();
    this.compressor.connect(this.mediaDest);

    this.setupDroneEngine();
    this.setupLeadEngine();
    this.setupAtmosphereEngine();

    this.isInitialized = true;
  }

  private setupDroneEngine(): void {
    if (!this.ctx || !this.masterGain) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.droneFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.setValueAtTime(110.0, this.ctx.currentTime); // A2

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.setValueAtTime(110.5, this.ctx.currentTime); // subtle detune chorusing

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  private setupLeadEngine(): void {
    if (!this.ctx || !this.masterGain) return;

    this.leadGain = this.ctx.createGain();
    this.leadGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.leadFilter = this.ctx.createBiquadFilter();
    this.leadFilter.type = 'bandpass';
    this.leadFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.leadFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    if (this.ctx.createStereoPanner) {
      this.leadPanner = this.ctx.createStereoPanner();
      this.leadPanner.pan.setValueAtTime(0, this.ctx.currentTime);
      this.leadFilter.connect(this.leadPanner);
      this.leadPanner.connect(this.leadGain);
    } else {
      this.leadFilter.connect(this.leadGain);
    }

    this.leadGain.connect(this.masterGain);

    this.leadOsc = this.ctx.createOscillator();
    this.leadOsc.type = 'sawtooth';
    this.leadOsc.frequency.setValueAtTime(220.0, this.ctx.currentTime);
    this.leadOsc.connect(this.leadFilter);
    this.leadOsc.start();
  }

  private setupAtmosphereEngine(): void {
    if (!this.ctx || !this.masterGain) return;

    // Create 3 seconds of looping stereo pink-white noise
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    this.noiseNode.start();
  }

  /**
   * Updates synthesis parameters when the frame or dataset changes
   */
  public updateFrame(
    frequencyHz: number,
    anomaly: number,
    droneWave: OscillatorType = 'sine',
    leadWave: OscillatorType = 'sawtooth',
    filterCutoffHz: number = 800,
    state: SonificationAudioState
  ): void {
    if (!this.ctx || !this.isInitialized) return;

    const now = this.ctx.currentTime;
    this.currentFrequency = frequencyHz;

    // Smoothly glide lead oscillator frequency
    if (this.leadOsc) {
      this.leadOsc.type = leadWave;
      this.leadOsc.frequency.setTargetAtTime(frequencyHz, now, 0.08);
    }

    // Lead filter cutoff adjusts with anomaly intensity
    if (this.leadFilter) {
      const dynamicCutoff = Math.max(200, Math.min(5000, filterCutoffHz * (1 + Math.abs(anomaly) * 0.3)));
      this.leadFilter.frequency.setTargetAtTime(dynamicCutoff, now, 0.12);
    }

    // Update Drone fundamental (octave below lead or base tone)
    const droneFreq = Math.max(45, frequencyHz / 2);
    if (this.droneOsc1 && this.droneOsc2) {
      this.droneOsc1.type = droneWave;
      this.droneOsc1.frequency.setTargetAtTime(droneFreq, now, 0.15);
      this.droneOsc2.frequency.setTargetAtTime(droneFreq * 1.004, now, 0.15);
    }

    if (this.droneFilter) {
      this.droneFilter.frequency.setTargetAtTime(Math.min(600, droneFreq * 3), now, 0.15);
    }

    // Atmosphere filter tracks environmental flux
    if (this.noiseFilter) {
      const noiseFreq = 400 + Math.abs(anomaly) * 200;
      this.noiseFilter.frequency.setTargetAtTime(noiseFreq, now, 0.2);
    }

    this.applyState(state);
  }

  /**
   * Applies user mixer toggles (mute, volume, layers, spatial pan)
   */
  public applyState(state: SonificationAudioState): void {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const targetVolume = state.isMuted || !state.isPlaying ? 0 : state.volume;

    this.masterGain.gain.setTargetAtTime(targetVolume, now, 0.05);

    if (this.droneGain) {
      const droneVol = state.layerDrone && state.isPlaying && !state.isMuted ? 0.25 : 0;
      this.droneGain.gain.setTargetAtTime(droneVol, now, 0.05);
    }

    if (this.leadGain) {
      const leadVol = state.layerLead && state.isPlaying && !state.isMuted ? 0.35 : 0;
      this.leadGain.gain.setTargetAtTime(leadVol, now, 0.05);
    }

    if (this.noiseGain) {
      const noiseVol = state.layerAtmosphere && state.isPlaying && !state.isMuted ? 0.08 : 0;
      this.noiseGain.gain.setTargetAtTime(noiseVol, now, 0.05);
    }
  }

  /**
   * Update stereo panning based on longitudinal globe coordinates or rotation
   */
  public setSpatialPanning(panVal: number): void {
    if (!this.leadPanner || !this.ctx) return;
    const clamped = Math.max(-1, Math.min(1, panVal));
    this.leadPanner.pan.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  /**
   * Interactive probe sonification: Sounds an instant reactive tone when the user clicks or hovers coordinates
   */
  public playProbeTone(freqHz: number, durationSec: number = 0.45, waveType: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freqHz, now);

    // Fast pleasant percussive envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  /**
   * Start recording the synthesized master output
   */
  public startRecording(): boolean {
    if (!this.mediaDest) return false;
    try {
      this.recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.mediaDest.stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(200);
      return true;
    } catch (e) {
      console.error('Failed to start audio recording:', e);
      return false;
    }
  }

  /**
   * Stop recording and download the audio blob
   */
  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get live frequency data array for visualizer canvas
   */
  public getByteFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as any);
    }
  }

  /**
   * Get live time-domain waveform data for oscilloscope visualizer
   */
  public getByteTimeDomainData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array as any);
    }
  }

  public getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  /**
   * Plays a gentle ascending space-science entrance chord when entering the app or dashboard
   */
  public async playEntranceChime(variant: 'portal' | 'dashboard' = 'portal'): Promise<void> {
    try {
      await this.init();
      if (!this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const notes =
        variant === 'dashboard'
          ? [146.83, 220.0, 293.66, 369.99, 440.0] // D major / open 5th radiant arrival
          : [130.81, 196.0, 261.63, 329.63]; // C major harmonic space arrival

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const start = now + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.11 / (idx * 0.25 + 1), start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.35);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(start);
        osc.stop(start + 1.45);
      });
    } catch {
      // Ignore if AudioContext is blocked prior to user gesture
    }
  }

  /**
   * Subtle acoustic feedback chime while typing text into portal inputs
   */
  public playKeystrokeTone(seedIndex: number = 0): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.ctx.state !== 'running') return;

      const scale = [392.0, 440.0, 493.88, 587.33, 659.25, 783.99];
      const freq = scale[Math.abs(seedIndex) % scale.length];

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // Fail silently on restricted environments
    }
  }

  /**
   * Speaks a clear, calm welcome greeting using Web Speech API
   */
  public speakWelcomeMessage(text: string): void {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors
    }
  }
}

// Global Singleton Instance
export const audioEngine = new AudioEngine();
