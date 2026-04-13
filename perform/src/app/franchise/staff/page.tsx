'use client';

/**
 * Staff Room — Front office management with drag-and-drop org chart.
 * Org chart layout: Owner -> GM -> HC -> Coordinators -> Position coaches.
 * Right panel: Available coaches/GMs from personnel pool.
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightClose, PanelRightOpen, ArrowRightLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BackHomeNav } from '@/components/layout/BackHomeNav';
import { OrgChart } from '@/components/franchise/OrgChart';
import { PersonnelPool } from '@/components/franchise/PersonnelPool';
import { StaffCard } from '@/components/franchise/StaffCard';
import { TeamSelector } from '@/components/franchise/TeamSelector';
import { SimulationButton } from '@/components/franchise/SimulationButton';
import { getOrgChart } from '@/lib/franchise/positions';
import { getTeamByAbbr } from '@/lib/franchise/teams';
import { getMockStaff } from '@/lib/franchise/mock-data';
import type { Sport, StaffMember, OrgChartNode, StaffRole } from '@/lib/franchise/types';

type MobileTab = 'org' | 'pool' | 'impact';

function StaffRoomInner() {
  const searchParams = useSearchParams();
  const sportParam = (searchParams.get('sport') as Sport) || 'nfl';
  const teamParam = searchParams.get('team') || undefined;

  const [sport, setSport] = useState<Sport>(sportParam);
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(teamParam);
  const [orgNodes, setOrgNodes] = useState<OrgChartNode[]>([]);
  const [pool, setPool] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStaff, setActiveStaff] = useState<StaffMember | null>(null);
  const [poolOpen, setPoolOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>('org');
  const [showTeamPicker, setShowTeamPicker] = useState(!teamParam);
  const [schemeChange, setSchemeChange] = useState<string | null>(null);

  const team = selectedTeam ? getTeamByAbbr(sport, selectedTeam) : undefined;

  // Load data
  const loadData = useCallback(async (s: Sport, t?: string) => {
    setLoading(true);
    setSchemeChange(null);

    // Try API, fall back to mock
    try {
      const res = await fetch(`/api/franchise/staff?sport=${s}&team=${t || ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.org) {
          setOrgNodes(data.org);
          setPool(data.pool || []);
          setLoading(false);
          return;
        }
      }
    } catch {
      // API not available
    }

    // Mock fallback
    const chart = getOrgChart(s);
    const allStaff = getMockStaff(s);
    const available = allStaff.filter((s) => s.available);

    // Pre-assign current team staff (mock: assign head coach if team matches)
    const assigned = allStaff.filter((st) => st.team === t);
    const updatedChart = chart.map((node) => {
      const match = assigned.find((s) => s.role === node.role);
      return match ? { ...node, staff: match } : node;
    });

    setOrgNodes(updatedChart);
    setPool(available);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadData(sport, selectedTeam);
      setShowTeamPicker(false);
    }
  }, [sport, selectedTeam, loadData]);

  // dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'staff') setActiveStaff(data.staff);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStaff(null);
    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current;
    const dropData = over.data.current;
    if (dragData?.type !== 'staff' || dropData?.type !== 'org-slot') return;

    const staffMember: StaffMember = dragData.staff;
    const targetRole: StaffRole = dropData.role;

    setOrgNodes((prev) =>
      prev.map((node) => {
        if (node.role === targetRole) {
          // Return existing staff to pool
          if (node.staff) setPool((p) => [...p, node.staff!]);
          return { ...node, staff: staffMember };
        }
        // Clear from old position if moved between slots
        if (node.staff?.id === staffMember.id) {
          return { ...node, staff: undefined };
        }
        return node;
      })
    );

    // Remove from pool
    setPool((prev) => prev.filter((s) => s.id !== staffMember.id));

    // Scheme change indicator
    if (staffMember.scheme && (targetRole === 'head_coach' || targetRole === 'offensive_coordinator' || targetRole === 'defensive_coordinator')) {
      const roleLabel = targetRole === 'head_coach' ? 'Head Coach' : targetRole === 'offensive_coordinator' ? 'Offensive Coordinator' : 'Defensive Coordinator';
      setSchemeChange(`${roleLabel} change: scheme shifts to ${staffMember.scheme}`);
    }
  };

  // Mobile tap-to-select
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const handleMobileTapStaff = (staff: StaffMember) => {
    if (!pendingRole) return;
    const targetRole = pendingRole as StaffRole;

    setOrgNodes((prev) =>
      prev.map((node) => {
        if (node.role === targetRole) {
          if (node.staff) setPool((p) => [...p, node.staff!]);
          return { ...node, staff };
        }
        if (node.staff?.id === staff.id) return { ...node, staff: undefined };
        return node;
      })
    );
    setPool((prev) => prev.filter((s) => s.id !== staff.id));
    setPendingRole(null);
    setMobileTab('org');

    if (staff.scheme) {
      setSchemeChange(`Scheme shifts to ${staff.scheme}`);
    }
  };

  const handleMobileTapRole = (role: string) => {
    setPendingRole(role);
    setMobileTab('pool');
  };

  const handleSimulate = async () => {
    await new Promise((r) => setTimeout(r, 2000));
    setSchemeChange(
      `Simulation complete: projected ${Math.round(7 + Math.random() * 6)}-${Math.round(
        5 + Math.random() * 6
      )} record with current staff configuration.`
    );
  };

  // Team picker
  if (showTeamPicker) {
    return (
      <>
        <Header />
        <main className="min-h-screen" style={{ background: 'var(--pf-bg)' }}>
          <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="flex items-center gap-3 mb-6">
              <BackHomeNav />
              <h1 className="text-xl font-outfit font-bold text-white">
                Staff Room — Select Team
              </h1>
            </div>
            <div className="flex gap-2 mb-8">
              {(['nfl', 'nba', 'mlb'] as Sport[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSport(s)}
                  className="px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-md transition-all"
                  style={{
                    background: sport === s ? 'rgba(212,168,83,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${sport === s ? 'rgba(212,168,83,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    color: sport === s ? '#D4A853' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
            <TeamSelector sport={sport} selected={selectedTeam} onSelect={setSelectedTeam} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen" style={{ background: 'var(--pf-bg)' }}>
        {/* Top bar */}
        <div
          className="px-6 py-3 flex items-center gap-3 flex-wrap"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <BackHomeNav />
          <h2 className="text-sm font-outfit font-bold text-white">Staff Room</h2>
          {team && (
            <div className="flex items-center gap-2 ml-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background: team.primaryColor, color: team.textColor }}
              >
                {team.abbreviation}
              </div>
              <span className="text-xs text-white/50">{team.name}</span>
            </div>
          )}
          <button
            onClick={() => setShowTeamPicker(true)}
            className="text-[10px] text-white/30 hover:text-white/50 transition-colors ml-2"
          >
            Change
          </button>

          <div className="flex gap-1 ml-auto">
            {(['nfl', 'nba', 'mlb'] as Sport[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSport(s);
                  setSelectedTeam(undefined);
                  setShowTeamPicker(true);
                }}
                className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded transition-all"
                style={{
                  background: sport === s ? 'rgba(212,168,83,0.15)' : 'transparent',
                  color: sport === s ? '#D4A853' : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${sport === s ? 'rgba(212,168,83,0.3)' : 'transparent'}`,
                }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex md:hidden border-b border-white/[0.06]">
          {(['org', 'pool', 'impact'] as MobileTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className="flex-1 py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all"
              style={{
                color: mobileTab === tab ? '#D4A853' : 'rgba(255,255,255,0.3)',
                borderBottom: mobileTab === tab ? '2px solid #D4A853' : '2px solid transparent',
              }}
            >
              {tab === 'org' ? 'Org Chart' : tab === 'pool' ? 'Personnel' : 'Impact'}
            </button>
          ))}
        </div>

        {/* Scheme change banner */}
        <AnimatePresence>
          {schemeChange && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div
                className="px-6 py-2 flex items-center gap-2"
                style={{
                  background: 'rgba(212,168,83,0.06)',
                  borderBottom: '1px solid rgba(212,168,83,0.15)',
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500/60" />
                <span className="text-[11px] text-amber-400/80">{schemeChange}</span>
                <button
                  onClick={() => setSchemeChange(null)}
                  className="ml-auto text-[10px] text-white/30 hover:text-white/50"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1">
            {/* Desktop */}
            <div className="hidden md:flex w-full" style={{ height: 'calc(100vh - 120px)' }}>
              {/* Left: Org Chart */}
              <div
                className="overflow-y-auto scrollbar-none p-6"
                style={{ width: poolOpen ? '65%' : '100%', transition: 'width 0.3s' }}
              >
                <OrgChart nodes={orgNodes} />
              </div>

              <button
                onClick={() => setPoolOpen(!poolOpen)}
                className="flex items-center px-1 hover:bg-white/[0.03] transition-colors"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              >
                {poolOpen ? (
                  <PanelRightClose className="w-4 h-4 text-white/20" />
                ) : (
                  <PanelRightOpen className="w-4 h-4 text-white/20" />
                )}
              </button>

              {/* Right: Personnel Pool */}
              <AnimatePresence>
                {poolOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '35%', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                    style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="h-full p-4 overflow-y-auto scrollbar-none">
                      <PersonnelPool
                        mode="staff"
                        staff={pool}
                        loading={loading}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile */}
            <div className="md:hidden w-full" style={{ minHeight: 'calc(100vh - 170px)' }}>
              {mobileTab === 'org' && (
                <div className="p-4">
                  {pendingRole && (
                    <div
                      className="mb-3 px-3 py-2 rounded-lg text-[11px] text-amber-400/80"
                      style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}
                    >
                      Tap a staff member to fill <strong>{pendingRole}</strong>
                    </div>
                  )}
                  <OrgChart nodes={orgNodes} onTapSelect={handleMobileTapRole} />
                </div>
              )}
              {mobileTab === 'pool' && (
                <div className="p-4 h-[calc(100vh-170px)]">
                  <PersonnelPool
                    mode="staff"
                    staff={pool}
                    loading={loading}
                    onTapSelect={(item) => handleMobileTapStaff(item as StaffMember)}
                  />
                </div>
              )}
              {mobileTab === 'impact' && (
                <div className="p-4">
                  {schemeChange ? (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                        Staff Impact
                      </h3>
                      <div
                        className="rounded-lg p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <p className="text-sm text-white/60">{schemeChange}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-white/15 text-sm">
                      Make staff changes to see impact analysis
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeStaff && <StaffCard staff={activeStaff} isDragOverlay />}
          </DragOverlay>
        </DndContext>

        {/* Bottom bar */}
        <div
          className="sticky bottom-0 px-6 py-3 flex items-center gap-3 flex-wrap"
          style={{
            background: 'rgba(10,10,15,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <SimulationButton label="Simulate Impact" onClick={handleSimulate} />
          <SimulationButton label="Simulate Draft Strategy" onClick={handleSimulate} variant="secondary" />
          <button
            onClick={() => loadData(sport, selectedTeam)}
            className="px-4 py-2 text-[11px] font-bold tracking-wider uppercase text-white/30 hover:text-white/50 transition-colors rounded-lg"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Reset Changes
          </button>
        </div>
      </main>
    </>
  );
}

export default function StaffRoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--pf-bg)' }} />}>
      <StaffRoomInner />
    </Suspense>
  );
}
