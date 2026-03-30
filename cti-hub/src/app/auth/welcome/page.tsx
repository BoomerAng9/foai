'use client';

import React, { useState, useCallback } from 'react';
import { Player } from '@remotion/player';
import {
  scenes,
  SCENE_CONFIG,
} from '@/components/video/walkthrough/WalkthroughComposition';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const totalScenes = scenes.length;
  const currentScene = scenes[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < totalScenes - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      router.push('/chat');
    }
  }, [currentIndex, totalScenes, router]);

  const handleSkip = useCallback(() => {
    router.push('/chat');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
        padding: 24,
      }}
    >
      {/* Scene title */}
      <div
        style={{
          fontSize: 14,
          color: '#666',
          marginBottom: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {currentScene.title}
      </div>

      {/* Video player */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #222',
          boxShadow: '0 0 60px rgba(232, 160, 32, 0.08)',
          marginBottom: 32,
        }}
      >
        <Player
          key={currentScene.id}
          component={currentScene.component}
          durationInFrames={SCENE_CONFIG.durationInFrames}
          fps={SCENE_CONFIG.fps}
          compositionWidth={SCENE_CONFIG.width}
          compositionHeight={SCENE_CONFIG.height}
          style={{ width: '100%' }}
          autoPlay
          controls={false}
        />
      </div>

      {/* Progress indicator */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          alignItems: 'center',
        }}
      >
        {scenes.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 32 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === currentIndex ? '#E8A020' : i < currentIndex ? '#E8A020' : '#333',
              opacity: i <= currentIndex ? 1 : 0.4,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
        <span style={{ color: '#666', fontSize: 14, marginLeft: 12 }}>
          {currentIndex + 1} of {totalScenes}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <button
          onClick={handleNext}
          style={{
            backgroundColor: '#E8A020',
            color: '#0A0A0A',
            fontSize: 16,
            fontWeight: 700,
            padding: '12px 48px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: 1,
          }}
        >
          {currentIndex < totalScenes - 1 ? 'NEXT' : 'GET STARTED'}
        </button>

        {currentIndex < totalScenes - 1 && (
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              textUnderlineOffset: 4,
            }}
          >
            SKIP ALL
          </button>
        )}
      </div>
    </div>
  );
}
