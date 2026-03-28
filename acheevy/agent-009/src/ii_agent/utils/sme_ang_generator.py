"""SME_ANG - Subject Matter Expert Clarification Question Generator.

Generates domain-specific clarification questions when user prompts
lack sufficient implementation details.
"""

from typing import Optional


def clarification_question_for(prompt: str, task_type: Optional[str] = None) -> str:
    """Generate domain-specific clarification question for vague prompts.
    
    Uses task type detection and prompt analysis to generate targeted
    questions that elicit missing implementation details.
    
    Args:
        prompt: Original or technical prompt
        task_type: Optional explicit task type (web, api, chart, analysis, etc.)
        
    Returns:
        Clarification question string
        
    Example:
        >>> clarification_question_for("build a landing page")
        'Before I execute: who is the target audience, what are the top 3 sections, ...'
    """
    prompt_lower = prompt.lower()
    
    # Detect task type from prompt if not provided
    if task_type is None:
        task_type = _detect_task_type(prompt_lower)
    
    # Domain-specific clarification questions
    if task_type in ("landing", "website", "page", "web"):
        return (
            "Before I execute: who is the target audience, what are the top 3 sections, "
            "and what visual style should it follow?"
        )
    
    elif task_type in ("api", "backend", "endpoint"):
        return (
            "Before I execute: what framework/language should I use, required endpoints, "
            "and expected request/response schema?"
        )
    
    elif task_type in ("chart", "graph", "visualization", "dashboard"):
        return (
            "Before I execute: what data source/format, chart type (bar/line/pie), "
            "and key metrics to display?"
        )
    
    elif task_type in ("analysis", "research", "report"):
        return (
            "Before I execute: what specific questions to answer, data sources to include, "
            "and desired output format (summary/detailed)?"
        )
    
    elif task_type in ("debug", "fix", "error"):
        return (
            "Before I execute: what error message/behavior, steps to reproduce, "
            "and expected vs actual outcome?"
        )
    
    elif task_type in ("deployment", "deploy", "production"):
        return (
            "Before I execute: target platform (AWS/GCP/Vercel), environment variables needed, "
            "and rollback/monitoring requirements?"
        )
    
    elif task_type in ("database", "schema", "migration"):
        return (
            "Before I execute: database type (PostgreSQL/MySQL/MongoDB), tables/collections needed, "
            "and relationships/constraints?"
        )
    
    elif task_type in ("auth", "login", "authentication"):
        return (
            "Before I execute: authentication method (JWT/OAuth/sessions), user roles/permissions, "
            "and password/security requirements?"
        )
    
    # Generic fallback for unrecognized task types
    return (
        "Before I execute: please confirm success criteria, constraints, "
        "and preferred stack/approach."
    )


def _detect_task_type(prompt_lower: str) -> str:
    """Detect task type from prompt text.
    
    Args:
        prompt_lower: Lowercase prompt text
        
    Returns:
        Detected task type string
    """
    # Task type detection rules (order matters - more specific first)
    task_patterns = {
        "landing": ["landing", "landing page", "homepage"],
        "website": ["website", "web app", "web application"],
        "page": ["page", "view", "screen"],
        "api": ["api", "endpoint", "rest", "graphql"],
        "backend": ["backend", "server", "microservice"],
        "chart": ["chart", "graph", "visualization", "plot"],
        "dashboard": ["dashboard", "admin panel"],
        "analysis": ["analysis", "analyze", "research", "report"],
        "debug": ["debug", "fix", "error", "bug", "issue"],
        "deployment": ["deploy", "deployment", "production", "release"],
        "database": ["database", "db", "schema", "migration", "table"],
        "auth": ["auth", "login", "signup", "authentication", "authorization"],
    }
    
    for task_type, patterns in task_patterns.items():
        if any(pattern in prompt_lower for pattern in patterns):
            return task_type
    
    return "generic"


def get_clarification_engine_label() -> str:
    """Get the engine label for clarification responses.
    
    Returns:
        Engine identifier string
    """
    return "NTNTN+SME_ANG"
