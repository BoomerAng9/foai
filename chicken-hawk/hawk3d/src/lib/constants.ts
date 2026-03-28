export const ROOM_POSITIONS: Record<string, [number, number, number]> = {
  'desk': [0, 0, 0],
  'gym': [8, 0, 0],
  'lab': [-8, 0, 0],
  'deploy-bay': [0, 0, 8],
  'review-room': [0, 0, -8],
  'flow-room': [8, 0, 8],
  'sandbox': [-8, 0, 8],
  'memory-vault': [8, 0, -8],
  'graph-room': [-8, 0, -8],
  'deep-ops': [0, 0, -16],
  'lounge': [0, 0, 16],
  'gateway': [0, 4, 0],
};

export const ROOM_LABELS: Record<string, string> = {
  'desk': 'Coding Desks',
  'gym': 'Skill Gym',
  'lab': 'Research Lab',
  'deploy-bay': 'Deploy Bay',
  'review-room': 'PR Review Room',
  'flow-room': 'Flow Automation',
  'sandbox': 'Sandbox Zone',
  'memory-vault': 'Memory Vault',
  'graph-room': 'Graph Workshop',
  'deep-ops': 'Deep Ops Center',
  'lounge': 'Hawk Lounge',
  'gateway': 'Gateway Hub',
};

export const STATUS_COLORS: Record<string, string> = {
  idle: '#8892B0',
  working: '#C8A84E',
  learning: '#4ECDC4',
  testing: '#FFEAA7',
  deploying: '#A29BFE',
  reviewing: '#74B9FF',
  automating: '#96CEB4',
  researching: '#FD79A8',
  offline: '#636E72',
};

export const ECOSYSTEM_REPOS = [
  { name: 'Chicken-Hawk', role: 'Intelligence Layer', color: '#E94560' },
  { name: 'AIMS', role: 'Platform Core', color: '#C8A84E' },
  { name: 'myclaw', role: 'Orchestration Hub', color: '#4ECDC4' },
  { name: 'Agent-ACHEEVY-009', role: 'Agent Framework', color: '#45B7D1' },
  { name: 'acheevy-whisper-build', role: 'Voice/STT Service', color: '#96CEB4' },
  { name: 'destinations-ai', role: 'Location Intelligence', color: '#FFEAA7' },
  { name: 'the-perform-platform', role: 'KPI Analytics', color: '#DDA0DD' },
  { name: 'LUC-Locale-Universal-Calculator', role: 'Finance Engine', color: '#74B9FF' },
  { name: 'GRAMMAR', role: 'NLP Engine', color: '#A29BFE' },
  { name: 'acheevy.digital', role: 'Public Portal', color: '#FD79A8' },
  { name: 'Locale-by-ACHIEVEMOR-2', role: 'Locale Frontend', color: '#E17055' },
  { name: 'CH-Docs', role: 'Documentation', color: '#636E72' },
];

export const GOVERNANCE_CHAIN = [
  'User',
  'ACHEEVY',
  'Boomer_Ang',
  'Chicken Hawk',
  'Squad',
  'Lil_Hawks',
];
