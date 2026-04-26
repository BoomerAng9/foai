"""Shared infrastructure for Coastal Brewing Co. ADK agents.

This package wires every agent's tool calls through the existing Coastal stack:
  - Chicken Hawk (gateway)            shared.chicken_hawk
  - NemoClaw (policy gate)            shared.nemoclaw
  - Hermes (audit trail)              shared.hermes
  - Spinner tools (callable surface)  shared.spinner_tools
  - Brand voice / claims rules        shared.coastal_context

ADK is the agent factory. Chicken Hawk is the runtime orchestrator. NemoClaw is
the policy gate. Hermes is the audit trail. Four layers, non-negotiable.
"""
