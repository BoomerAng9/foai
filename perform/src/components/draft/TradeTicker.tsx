'use client';

import { motion } from 'framer-motion';
import type { TradeDetails } from '@/lib/draft/types';

interface TradeTickerProps { trades: TradeDetails[]; }

export function TradeTicker({ trades }: TradeTickerProps) {
  if (trades.length === 0) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.95) 20%)', borderTop: '1px solid rgba(245,166,35,0.2)' }}>
      <div className="flex items-center h-8">
        <div className="flex-shrink-0 px-3 h-full flex items-center" style={{ background: '#F5A623' }}>
          <span className="text-[10px] font-black tracking-[0.2em] text-black uppercase">TRADE ALERT</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <motion.div className="flex items-center gap-8 whitespace-nowrap"
            animate={{ x: [0, -2000] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
            {[...trades, ...trades].map((trade, idx) => (
              <span key={`${trade.trade_id}-${idx}`} className="text-xs flex items-center gap-2">
                <span className="text-amber-400 font-bold">{trade.team_a_abbr}</span>
                <span className="text-white/30">&harr;</span>
                <span className="text-amber-400 font-bold">{trade.team_b_abbr}</span>
                <span className="text-white/40">{trade.headline}</span>
                <span className="text-white/10">|</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
