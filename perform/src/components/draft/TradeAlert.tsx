'use client';

import { motion } from 'framer-motion';
import type { TradeDetails } from '@/lib/draft/types';
import { getTeam } from '@/lib/draft/teams';

interface TradeAlertProps { trade: TradeDetails; onClose?: () => void; }

export function TradeAlert({ trade, onClose }: TradeAlertProps) {
  const teamA = getTeam(trade.team_a_abbr);
  const teamB = getTeam(trade.team_b_abbr);
  return (
    <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="rounded-xl overflow-hidden" style={{ background: 'rgba(10,10,15,0.95)', border: '1px solid rgba(245,166,35,0.3)', boxShadow: '0 0 40px rgba(245,166,35,0.1)' }}>
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'rgba(245,166,35,0.15)' }}>
        <span className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase">TRADE ALERT</span>
        {onClose && <button onClick={onClose} className="text-white/30 hover:text-white/60 transition text-sm">&times;</button>}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-sm font-black mb-2" style={{ background: teamA.primaryColor, color: teamA.textColor }}>{trade.team_a_abbr}</div>
            <div className="text-xs font-bold text-white">{trade.team_a}</div>
            <div className="mt-2 text-[10px] text-white/40">
              <div className="font-bold text-red-400 mb-1">GIVES:</div>
              {trade.team_a_gives.map((item, i) => <div key={i}>{typeof item === 'number' ? `Pick #${item}` : item}</div>)}
            </div>
          </div>
          <div className="text-2xl text-amber-400">&#8644;</div>
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-sm font-black mb-2" style={{ background: teamB.primaryColor, color: teamB.textColor }}>{trade.team_b_abbr}</div>
            <div className="text-xs font-bold text-white">{trade.team_b}</div>
            <div className="mt-2 text-[10px] text-white/40">
              <div className="font-bold text-green-400 mb-1">GIVES:</div>
              {trade.team_b_gives.map((item, i) => <div key={i}>{typeof item === 'number' ? `Pick #${item}` : item}</div>)}
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <span className="text-[10px] font-mono text-white/30">Trade Value: {trade.trade_value_diff > 0 ? '+' : ''}{trade.trade_value_diff} pts</span>
        </div>
      </div>
    </motion.div>
  );
}
