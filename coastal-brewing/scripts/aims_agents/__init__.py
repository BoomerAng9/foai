"""A.I.M.S. agentic surfaces.

Tool-using agents that route through the A.I.M.S. Model Gateway. Each
module here defines its tool schema, tool dispatch, and the agent loop
that runs the Sonnet/Opus tool-use cycle. Endpoints in api_server.py
call these agents and surface the results.

Modules:
- linkedin_maps_agent — B2B prospecting (LinkedIn + Google Maps).
- code_ang             — repo-grounded code reasoning + read-only tools.
- crucible_judge       — pass/fail evaluation against named contracts.
- lilhawk_dispatch     — task-to-Lil_Hawk-worker routing.
"""
