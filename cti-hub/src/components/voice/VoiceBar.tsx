'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';

interface VoiceBarProps {
  onTranscript: (text: string) => void;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
}

export function VoiceBar({ onTranscript, voiceEnabled, onVoiceToggle }: VoiceBarProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [waveform, setWaveform] = useState<number[]>(new Array(20).fill(0));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
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

  function startListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(interim || final);
      if (final) {
        onTranscript(final);
        setTranscript('');
      }
    };

    recognition.onerror = () => { stopListening(); };
    recognition.onend = () => {
      if (listening) { try { recognition.start(); } catch {} }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    startWaveform();
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
    setTranscript('');
    stopWaveform();
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-bg-surface border-t border-border">
      <button
        onClick={() => listening ? stopListening() : startListening()}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
          listening ? 'text-white animate-pulse' : 'bg-bg-elevated border border-border text-fg-secondary hover:text-fg hover:border-fg-ghost'
        }`}
        style={listening ? { backgroundColor: '#E8A020' } : undefined}
        title={listening ? 'Stop listening' : 'Talk to ACHEEVY'}
      >
        {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      <div className="flex items-end gap-[2px] h-8 flex-1 min-w-0">
        {listening ? waveform.map((v, i) => (
          <div key={i} className="flex-1 bg-accent transition-all duration-75"
            style={{ height: `${Math.max(v * 100, 4)}%`, minHeight: 2, opacity: 0.4 + v * 0.6 }} />
        )) : (
          <div className="flex-1 flex items-center">
            <p className="text-[10px] text-fg-ghost font-mono">
              {transcript || (listening ? 'Listening...' : 'Click mic to talk to ACHEEVY')}
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
        title={voiceEnabled ? 'Mute ACHEEVY' : 'Unmute ACHEEVY'}
      >
        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  );
}
