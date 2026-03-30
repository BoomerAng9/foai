"""Default KPI definitions for all agents in the FOAI hierarchy.

Called during startup to ensure every agent has its KPIs registered.
HR PMO measures these continuously.
"""

from __future__ import annotations

# Agent KPI definitions: (kpi_name, description, target, unit, interval)
AGENT_KPIS: dict[str, list[tuple[str, str, float, str, str]]] = {
    # ─── ACHEEVY (Boss) ────────────────────────────────────
    "ACHEEVY": [
        ("strategic_decisions_per_week", "Number of strategic decisions made", 5, "count", "weekly"),
        ("agent_deployment_success_rate", "Percentage of successful agent deployments", 95, "percent", "weekly"),
        ("revenue_growth_rate", "Week-over-week revenue growth percentage", 5, "percent", "weekly"),
        ("governance_compliance", "Percentage of actions within governance rules", 100, "percent", "weekly"),
    ],
    # ─── Chicken Hawk (2IC) ────────────────────────────────
    "Chicken_Hawk": [
        ("request_routing_accuracy", "Percentage of correctly routed requests", 95, "percent", "weekly"),
        ("avg_response_time_ms", "Average end-to-end response time", 3000, "ms", "daily"),
        ("review_gate_pass_rate", "Percentage of responses passing review gate", 90, "percent", "weekly"),
        ("fleet_availability", "Percentage of Lil_Hawks online and healthy", 95, "percent", "daily"),
    ],
    # ─── Boomer_Angs ───────────────────────────────────────
    "Edu_Ang": [
        ("enrollment_conversion_rate", "Percentage of link clicks converting to enrollments", 15, "percent", "weekly"),
        ("links_served_per_day", "Average affiliate links served daily", 50, "count", "daily"),
        ("revenue_per_enrollment", "Average revenue per enrollment in USD", 25, "usd", "weekly"),
        ("task_completion_score", "Average task quality score", 85, "score", "weekly"),
    ],
    "Scout_Ang": [
        ("institutions_scraped_per_week", "New institutions discovered per week", 10, "count", "weekly"),
        ("open_seats_found_per_week", "Total open seats discovered per week", 100, "count", "weekly"),
        ("data_freshness_hours", "Hours since last successful scrape", 24, "hours", "daily"),
        ("task_completion_score", "Average task quality score", 85, "score", "weekly"),
    ],
    "Content_Ang": [
        ("articles_published_per_week", "SEO articles published per week", 3, "count", "weekly"),
        ("organic_traffic_growth", "Week-over-week organic traffic growth", 5, "percent", "weekly"),
        ("content_quality_score", "Average content quality score", 80, "score", "weekly"),
        ("task_completion_score", "Average task quality score", 85, "score", "weekly"),
    ],
    "Ops_Ang": [
        ("fleet_uptime_percent", "Percentage of services reporting healthy", 99, "percent", "daily"),
        ("health_check_coverage", "Percentage of services monitored", 100, "percent", "weekly"),
        ("incident_response_time_ms", "Average time to detect and report issues", 60000, "ms", "daily"),
        ("task_completion_score", "Average task quality score", 85, "score", "weekly"),
    ],
    "Biz_Ang": [
        ("leads_generated_per_week", "New SaaS leads generated per week", 5, "count", "weekly"),
        ("client_retention_rate", "Percentage of clients retained month-over-month", 90, "percent", "monthly"),
        ("onboarding_completion_rate", "Percentage of new clients fully onboarded", 85, "percent", "monthly"),
        ("task_completion_score", "Average task quality score", 85, "score", "weekly"),
    ],
    # ─── Infrastructure Engines ────────────────────────────
    "Hermes": [
        ("evaluation_completion_rate", "Percentage of scheduled evaluations completed", 100, "percent", "weekly"),
        ("consensus_model_coverage", "Number of models contributing to consensus", 3, "count", "weekly"),
        ("directive_compliance_rate", "Percentage of directives acted upon by agents", 80, "percent", "weekly"),
        ("memory_recall_relevance", "Average similarity score of recalled memories", 0.7, "score", "weekly"),
    ],
}


async def register_all_kpis(hr_managers: dict[str, "HRPMOManager"]) -> int:
    """Register KPIs for all agents. Returns count of KPIs registered."""
    count = 0
    for agent_name, kpis in AGENT_KPIS.items():
        hr = hr_managers.get(agent_name)
        if hr is None:
            continue
        for kpi_name, desc, target, unit, interval in kpis:
            await hr.define_kpi(kpi_name, desc, target, unit, interval)
            count += 1
    return count
