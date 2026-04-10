'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { staggerContainer, staggerItem, heroStagger, heroItem } from '@/lib/motion';

interface NFTCard {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string | number }[];
  properties: {
    tier: string;
    tier_color: string;
    rarity: string;
  };
}

interface NFTCollection {
  name: string;
  description: string;
  total_supply: number;
  tiers: { elite: number; blue_chip: number; starter: number; prospect: number };
  cards: NFTCard[];
}

export default function PlayerCardsPage() {
  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState<NFTCard | null>(null);

  useEffect(() => {
    fetch('/api/nft?all=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCollection(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load card collection.');
        setLoading(false);
      });
  }, []);

  function getAttr(card: NFTCard, trait: string): string {
    const attr = card.attributes.find((a) => a.trait_type === trait);
    return attr ? String(attr.value) : '--';
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <motion.div
            variants={heroItem}
            className="inline-block px-4 py-1.5 mb-4 rounded-full"
            style={{
              background: 'rgba(212,168,83,0.08)',
              border: '1px solid rgba(212,168,83,0.2)',
            }}
          >
            <span
              className="text-[10px] font-mono tracking-[0.3em]"
              style={{ color: '#D4A853' }}
            >
              DIGITAL COLLECTIBLES
            </span>
          </motion.div>
          <motion.h1
            variants={heroItem}
            className="font-outfit text-4xl md:text-6xl font-black tracking-tight text-white"
          >
            DRAFT CARDS
          </motion.h1>
          <motion.p
            variants={heroItem}
            className="mt-3 text-sm font-mono text-white/35"
          >
            2026 NFL Draft Collection — graded by TIE
          </motion.p>
          <motion.div
            variants={heroItem}
            className="mt-5 mx-auto w-48 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, #D4A853, transparent)',
            }}
          />
        </motion.div>

        {/* Tier summary */}
        {collection && (
          <motion.div
            variants={heroItem}
            initial="hidden"
            animate="visible"
            className="flex justify-center gap-4 mb-10 flex-wrap"
          >
            {[
              { label: 'ELITE', count: collection.tiers.elite, color: '#D4A853' },
              { label: 'BLUE CHIP', count: collection.tiers.blue_chip, color: '#3B82F6' },
              { label: 'STARTER', count: collection.tiers.starter, color: '#10B981' },
              { label: 'PROSPECT', count: collection.tiers.prospect, color: '#8B5CF6' },
            ].map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{
                  background: `${t.color}10`,
                  border: `1px solid ${t.color}25`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: t.color }}
                />
                <span
                  className="text-[10px] font-mono font-bold tracking-wider"
                  style={{ color: t.color }}
                >
                  {t.label}
                </span>
                <span className="text-xs font-mono text-white/30">{t.count}</span>
              </div>
            ))}
          </motion.div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <span className="text-sm font-mono text-white/30 animate-pulse">
              Loading collection...
            </span>
          </div>
        )}

        {error && (
          <div
            className="max-w-xl mx-auto mb-8 px-4 py-3 rounded-lg text-center"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <span className="text-sm font-mono" style={{ color: '#EF4444' }}>
              {error}
            </span>
          </div>
        )}

        {/* Card Gallery Grid */}
        {collection && collection.cards.length > 0 && (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {collection.cards.map((card, i) => {
              const tierColor = card.properties.tier_color;
              return (
                <motion.button
                  key={i}
                  variants={staggerItem}
                  onClick={() => setSelectedCard(card)}
                  className="group relative rounded-xl overflow-hidden text-left transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${tierColor}20`,
                    aspectRatio: '5/7',
                  }}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* SVG card preview */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(10,10,15,0.95) 0%, transparent 60%)',
                    }}
                  >
                    <div className="p-3 w-full">
                      <p className="text-xs font-outfit font-bold text-white truncate">
                        {getAttr(card, 'Player')}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">
                        {getAttr(card, 'Position')} &middot;{' '}
                        {getAttr(card, 'School')}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${tierColor}18`,
                            color: tierColor,
                          }}
                        >
                          {card.properties.tier}
                        </span>
                        <span
                          className="text-xs font-mono font-bold"
                          style={{ color: tierColor }}
                        >
                          {getAttr(card, 'Grade')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top-left rank badge */}
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-md"
                    style={{
                      background: 'rgba(10,10,15,0.85)',
                      border: `1px solid ${tierColor}30`,
                    }}
                  >
                    <span
                      className="text-[9px] font-mono font-bold"
                      style={{ color: tierColor }}
                    >
                      #{getAttr(card, 'Overall Rank')}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Selected Card Modal */}
        {selectedCard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              className="relative max-w-md w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* SVG card full size */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedCard.image}
                alt={selectedCard.name}
                className="w-full rounded-xl"
                style={{
                  border: `2px solid ${selectedCard.properties.tier_color}40`,
                  boxShadow: `0 0 60px ${selectedCard.properties.tier_color}15`,
                }}
              />

              {/* Details below card */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-outfit text-lg font-bold text-white">
                    {getAttr(selectedCard, 'Player')}
                  </h3>
                  <span
                    className="text-sm font-mono font-bold px-3 py-1 rounded-full"
                    style={{
                      background: `${selectedCard.properties.tier_color}15`,
                      color: selectedCard.properties.tier_color,
                    }}
                  >
                    {selectedCard.properties.rarity}
                  </span>
                </div>
                <p className="text-xs font-mono text-white/40">
                  {getAttr(selectedCard, 'Position')} &middot;{' '}
                  {getAttr(selectedCard, 'School')} &middot; Round{' '}
                  {getAttr(selectedCard, 'Projected Round')}
                </p>
                <p className="text-xs font-mono text-white/30">
                  NFL Comp: {getAttr(selectedCard, 'NFL Comparison')}
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedCard(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                &times;
              </button>
            </motion.div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
