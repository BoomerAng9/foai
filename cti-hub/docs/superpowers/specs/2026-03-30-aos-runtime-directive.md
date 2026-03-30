# AOS Runtime & Distribution Layer — Build Directive

Saved from conversation. See full spec in conversation history.

## Summary
3 layers: MCP Gateway + Live Look In + Voice Interface

## Phase 1: MCP Gateway (NEXT)
- mcp.foai.cloud/mcp
- Exposes Boomer_Angs + Lil_Hawks as MCP tools
- SSE + HTTP, API key auth, tier gating

## Phase 2: Live Look In Command Center
- Merge hawk3d + live_look_in_v2
- 3D floor + activity panel + project plans + KPIs

## Phase 3: Voice Interface (Gemini 3.1 Flash Live)
- Real-time bidirectional voice with ACHEEVY
- Function calling to dispatch agents mid-conversation

## Decision: DeerFlow 2.0 = YES, LangGraph = NO
