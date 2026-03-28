import { Player } from '@remotion/player'
import { AbsoluteFill } from 'remotion'

type HandoffTransitionVideoProps = {
  backend: string
  task: string
}

function HandoffTransitionVideo({ backend, task }: HandoffTransitionVideoProps) {
  return (
    <AbsoluteFill
      className="font-['Sora'] text-slate-50 bg-[radial-gradient(circle_at_20%_20%,#f59e0b_0%,transparent_35%),radial-gradient(circle_at_80%_10%,#22d3ee_0%,transparent_30%),linear-gradient(125deg,#06080f_0%,#111827_35%,#0b1220_100%)]"
    >
      <AbsoluteFill className="items-center justify-center">
        <div className="w-[86%] max-w-[980px] rounded-[28px] border border-white/20 bg-slate-950/75 backdrop-blur-md shadow-[0_18px_70px_rgba(0,0,0,0.45)] p-[34px]">
          <div className="text-[13px] tracking-[0.22em] uppercase text-amber-300">ACHEEVY Transition Layer</div>
          <div className="mt-2.5 text-[40px] font-bold leading-tight">
            Seamless Handoff In Progress
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="border border-white/15 rounded-2xl p-[14px] bg-slate-900/70">
              <div className="text-xs text-slate-400 uppercase">From</div>
              <div className="mt-1.5 text-2xl font-semibold">ACHEEVY</div>
            </div>
            <div className="border border-white/15 rounded-2xl p-[14px] bg-slate-900/70">
              <div className="text-xs text-slate-400 uppercase">To</div>
              <div className="mt-1.5 text-2xl font-semibold">{backend || 'ii-agent'}</div>
            </div>
          </div>
          <div className="mt-4 border border-cyan-400/25 rounded-2xl p-[14px] bg-cyan-900/20">
            <div className="text-xs text-cyan-300 uppercase">Execution Task</div>
            <div className="mt-1.5 text-lg">{task || 'Preparing execution payload'}</div>
          </div>
          <div className="mt-[18px] flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_26px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-sm text-slate-300">Executing with full toolchain and artifact pipeline</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

type HandoffTransitionPlayerProps = {
  backend: string
  task: string
}

export function HandoffTransitionPlayer({ backend, task }: HandoffTransitionPlayerProps) {
  return (
    <Player
      component={HandoffTransitionVideo}
      durationInFrames={170}
      fps={30}
      compositionWidth={1280}
      compositionHeight={720}
      controls={false}
      loop={false}
      autoPlay
      inputProps={{ backend, task }}
      className="w-full h-full rounded-2xl overflow-hidden"
    />
  )
}

export default HandoffTransitionPlayer
