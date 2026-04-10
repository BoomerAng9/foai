'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Mic, Volume2, VolumeX, Square } from 'lucide-react';

// Agent avatar map — matches agent keys from AGENT_PERSONAS
const AGENT_AVATARS: Record<string, string> = {
  acheevy: '/acheevy-helmet.png',
  chicken_hawk: '/boomer-ang-icon.png',
  consult_ang: '/boomer-ang-icon.png',
  void_caster: '/agents/void-caster.png',
  the_colonel: '/agents/the-colonel.png',
  haze: '/agents/haze.png',
  smoke: '/agents/smoke.png',
  astra_novatos: '/agents/astra.png',
  bun_e: '/agents/bun-e.png',
  betty_anne_ang: '/boomer-ang-icon.png',
};

interface VoiceBarProps {
  onTranscript: (text: string) => void;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  activeAgent?: string;
}

export function VoiceBar({ onTranscript, voiceEnabled, onVoiceToggle, activeAgent = 'acheevy' }: VoiceBarProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(new Array(20).fill(0));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    return () => { stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWaveform = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 64;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      function update() {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const bars = Array.from(dataArray).slice(0, 20).map(v => v / 255);
        setWaveform(bars);
        animFrameRef.current = requestAnimationFrame(update);
      }
      update();
    } catch {}
  }, []);

  const stopWaveform = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    analyzerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setWaveform(new Array(20).fill(0));
  }, []);

  async function startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start MediaRecorder for Whisper transcription
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorderRef.current = recorder;
      recorder.start();

      // Also start browser STT for real-time interim text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (!event.results[i].isFinal) interim += event.results[i][0].transcript;
          }
          if (interim) setTranscript(interim);
        };
        recognition.onerror = () => {};
        recognition.onend = () => {};
        recognitionRef.current = recognition;
        recognition.start();
      }

      // Reuse stream for waveform (don't request mic twice)
      streamRef.current = stream;
      setListening(true);
      startWaveform();
    } catch {
      // Mic access denied
    }
  }

  async function stopListening() {
    // Stop browser STT
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    // Stop recorder and send to Whisper
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      // Wait for final data
      await new Promise<void>((resolve) => {
        if (recorderRef.current) {
          recorderRef.current.onstop = () => resolve();
        } else {
          resolve();
        }
      });

      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (audioBlob.size > 1000) {
        setTranscribing(true);
        setTranscript('Transcribing...');
        try {
          const form = new FormData();
          form.append('audio', audioBlob, 'recording.webm');
          const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
          const data = await res.json();
          if (data.text) {
            onTranscript(data.text);
          }
        } catch { /* Whisper failed — browser STT was real-time fallback */ }
        setTranscribing(false);
      }
    }

    setListening(false);
    setTranscript('');
    stopWaveform();
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-bg-surface flex-1">
      <button
        onClick={() => listening ? stopListening() : startListening()}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 overflow-hidden ${
          listening ? 'ring-2 ring-accent animate-pulse' : 'ring-1 ring-border hover:ring-accent/50'
        }`}
        title={listening ? 'Stop listening' : `Talk to ${activeAgent.toUpperCase()}`}
      >
        <Image
          src={AGENT_AVATARS[activeAgent] || '/acheevy-helmet.png'}
          alt={activeAgent}
          width={48}
          height={48}
          className="rounded-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {/* Fallback mic icon if image fails */}
        <span className="absolute inset-0 flex items-center justify-center">
          {listening ? <Square className="w-4 h-4 text-white drop-shadow-md" /> : null}
        </span>
        {/* Listening glow ring */}
        {listening && (
          <span className="absolute inset-0 rounded-full border-2 border-accent animate-ping opacity-30" />
        )}
      </button>

      <div className="flex items-end gap-[2px] h-8 flex-1 min-w-0">
        {listening ? waveform.map((v, i) => (
          <div key={i} className="flex-1 bg-accent transition-all duration-75"
            style={{ height: `${Math.max(v * 100, 4)}%`, minHeight: 2, opacity: 0.4 + v * 0.6 }} />
        )) : (
          <div className="flex-1 flex items-center">
            <p className="text-[10px] text-fg-ghost font-mono">
              {transcribing ? 'Transcribing...' : transcript || (listening ? 'Listening...' : `Click mic to talk to ${activeAgent.toUpperCase()}`)}
            </p>
          </div>
        )}
      </div>

      {listening && transcript && (
        <div className="max-w-[200px] truncate">
          <p className="text-[10px] text-accent font-mono italic">{transcript}</p>
        </div>
      )}

      <button
        onClick={onVoiceToggle}
        className={`w-8 h-8 flex items-center justify-center transition-colors shrink-0 ${
          voiceEnabled ? 'text-accent' : 'text-fg-ghost hover:text-fg-secondary'
        }`}
        title={voiceEnabled ? `Mute ${activeAgent.toUpperCase()}` : `Unmute ${activeAgent.toUpperCase()}`}
      >
        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  );
}
