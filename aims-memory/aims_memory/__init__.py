"""FOAI-AIMS Organizational Memory — shared library for all agents.

Provides pgvector-backed semantic memory, project plan management,
KPI/OKR tracking, and HR PMO evaluation for the entire agent hierarchy.
Every agent (ACHEEVY, Chicken Hawk, Boomer_Angs, Lil_Hawks, engines)
uses this library to remember, plan, and be measured.
"""

from aims_memory.client import MemoryClient
from aims_memory.embeddings import generate_embedding
from aims_memory.plans import ProjectPlanManager
from aims_memory.hr_pmo import HRPMOManager

__all__ = [
    "MemoryClient",
    "generate_embedding",
    "ProjectPlanManager",
    "HRPMOManager",
]
