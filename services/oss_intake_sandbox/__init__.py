"""OSS Intake quarantine sandbox CLI — Phase 4A Step-2 enablement (#91).

Reusable harness that runs the v2 Open Source Agent Intake skill trust gate
against a candidate OSS repo. Orchestrates freshness + license + SBOM + dep
scan + secret scan + SAST + filesystem scan, then appends results to the
target tool's PROOF_BUNDLE.md.

Coastal-safe by topology: no FOAI Docker network access, no openclaw vault
mount, no Coastal credentials in scope. Per memory
`feedback_secure_coastal_in_all_ways_during_foai_work_2026_05_15`.
"""
