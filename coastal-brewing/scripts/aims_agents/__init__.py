"""A.I.M.S. agentic surfaces.

Tool-using agents that route through the A.I.M.S. Model Gateway. Each
module here defines its tool schema, tool dispatch, and the agent loop
that runs the Sonnet/Opus tool-use cycle. Endpoints in api_server.py
call these agents and surface the results.

Modules:
- linkedin_maps_agent — B2B prospecting (LinkedIn + Google Maps).
"""
