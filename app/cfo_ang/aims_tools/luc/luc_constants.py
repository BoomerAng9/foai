"""LUC Service Catalog — v1 billable resource keys.

These are the canonical keys used across the entire FOAI-AIMS ecosystem.
Quota limits are loaded from Firestore plans, never hardcoded here.
"""

# Token-based LLM metering
LLM_TOKENS_IN = "llm_tokens_in"
LLM_TOKENS_OUT = "llm_tokens_out"

# Workflow / automation
N8N_EXECUTIONS = "n8n_executions"
NODE_RUNTIME_SECONDS = "node_runtime_seconds"

# Agent orchestration
SWARM_CYCLES = "swarm_cycles"

# External API
BRAVE_QUERIES = "brave_queries"

# Voice / speech
VOICE_CHARS = "voice_chars"
STT_MINUTES = "stt_minutes"

# Infrastructure
CONTAINER_HOURS = "container_hours"
STORAGE_GB_MONTH = "storage_gb_month"
BANDWIDTH_GB = "bandwidth_gb"

# Ordered catalog for iteration
SERVICE_CATALOG = [
    LLM_TOKENS_IN,
    LLM_TOKENS_OUT,
    N8N_EXECUTIONS,
    NODE_RUNTIME_SECONDS,
    SWARM_CYCLES,
    BRAVE_QUERIES,
    VOICE_CHARS,
    STT_MINUTES,
    CONTAINER_HOURS,
    STORAGE_GB_MONTH,
    BANDWIDTH_GB,
]

# Human-readable labels
LABELS = {
    LLM_TOKENS_IN: "LLM Input Tokens",
    LLM_TOKENS_OUT: "LLM Output Tokens",
    N8N_EXECUTIONS: "n8n Executions",
    NODE_RUNTIME_SECONDS: "Node Runtime (sec)",
    SWARM_CYCLES: "Swarm Cycles",
    BRAVE_QUERIES: "Brave Search Queries",
    VOICE_CHARS: "Voice Characters",
    STT_MINUTES: "STT Minutes",
    CONTAINER_HOURS: "Container Hours",
    STORAGE_GB_MONTH: "Storage (GB/mo)",
    BANDWIDTH_GB: "Bandwidth (GB)",
}
