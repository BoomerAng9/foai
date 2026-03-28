"use client";

import { useState, useEffect } from 'react';

interface SystemStats {
  activeJobs: number;
  checkpoints: number;
  systemLoad: number;
  openIssues: number;
  ramUsage: string;
  latency: string;
  uptime: string;
}

interface LogEntry {
  event: string;
  time: string;
}

export function useSystemStatus() {
  const [stats, setStats] = useState<SystemStats>({
    activeJobs: 12,
    checkpoints: 84,
    systemLoad: 24,
    openIssues: 0,
    ramUsage: '4.2GB / 16GB',
    latency: '42ms',
    uptime: '99.99%',
  });

  const [recentEvents, setRecentEvents] = useState<LogEntry[]>([
    { event: "TLI: New Source Indexed", time: new Date().toLocaleTimeString() },
    { event: "BuildSmith: Deploying v1.2", time: new Date(Date.now() - 120000).toLocaleTimeString() },
    { event: "MIM: Policy Check Passed", time: new Date(Date.now() - 300000).toLocaleTimeString() }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate slight fluctuations
      setStats(prev => ({
        ...prev,
        activeJobs: Math.max(8, prev.activeJobs + (Math.random() > 0.5 ? 1 : -1)),
        systemLoad: Math.min(60, Math.max(15, prev.systemLoad + (Math.random() > 0.5 ? 2 : -2))),
        latency: `${Math.floor(35 + Math.random() * 15)}ms`,
        ramUsage: `${(4.2 + (Math.random() * 0.2)).toFixed(1)}GB / 16GB`,
      }));

      // Occasionally add a new log event
      if (Math.random() > 0.8) {
        const potentialEvents = [
          "MIM: Governance Refresh",
          "Picker_Ang: Routing Optimized",
          "TLI: Vector Cache Hit",
          "Boomer_Ang: Worker Scoped",
          "BuildSmith: Asset Checksum OK"
        ];
        const newEvent = {
          event: potentialEvents[Math.floor(Math.random() * potentialEvents.length)],
          time: new Date().toLocaleTimeString()
        };
        setRecentEvents(prev => [newEvent, ...prev.slice(0, 4)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { stats, recentEvents };
}
