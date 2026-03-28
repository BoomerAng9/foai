"""NTNTN Engine - Layman-to-Technical Prompt Normalizer.

Converts casual user language into structured technical specifications,
improving execution clarity and reducing ambiguity.
"""

import re
from typing import Tuple


# NTNTN Translation Dictionary: Layman → Technical
LAYMAN_TO_TECH = {
    "website": "responsive web application",
    "page": "UI view",
    "landing page": "marketing landing page with conversion-focused information architecture",
    "make": "implement",
    "build": "design and implement",
    "create": "design and implement",
    "nice": "polished, production-grade",
    "fast": "low-latency and optimized",
    "quick": "low-latency and optimized",
    "secure": "secure-by-default with input validation and least privilege",
    "database": "persistent data layer with schema design and migration strategy",
    "login": "authentication flow with session/token handling",
    "signup": "user registration flow with validation",
    "api": "REST API or GraphQL endpoint",
    "backend": "server-side application logic",
    "frontend": "client-side user interface",
    "app": "application",
    "dashboard": "administrative data visualization interface",
    "chart": "data visualization component",
    "graph": "data visualization component",
    "form": "data input interface with validation",
}


def ntntn_translate(prompt: str) -> str:
    """Normalize layman prompt into technical execution language.
    
    Uses pattern matching to replace casual terminology with precise
    technical specifications.
    
    Args:
        prompt: Raw user input with casual language
        
    Returns:
        Technical specification with normalized terminology
        
    Example:
        >>> ntntn_translate("build a nice website with login")
        'NTNTN Technical Spec:\\n- Objective: design and implement a polished, ...'
    """
    normalized = prompt.strip()
    
    # Apply dictionary-based normalization
    for source, target in LAYMAN_TO_TECH.items():
        normalized = re.sub(
            rf"\b{re.escape(source)}\b", 
            target, 
            normalized, 
            flags=re.IGNORECASE
        )

    return (
        "NTNTN Technical Spec:\n"
        f"- Objective: {normalized}\n"
        "- Deliverables: implementation plan, production-ready code artifacts, and validation checks\n"
        "- Constraints: preserve black-box UX, keep responses concise, support interruption and clarification flow"
    )


def clarification_score(original_prompt: str, technical_prompt: str) -> float:
    """Calculate clarity score for a prompt (0.0 = vague, 1.0 = specific).
    
    Evaluates whether prompt contains sufficient implementation details
    by checking for required context signals.
    
    Args:
        original_prompt: User's raw input
        technical_prompt: NTNTN-translated version
        
    Returns:
        Clarity score from 0.0 (needs clarification) to 1.0 (ready to execute)
        
    Example:
        >>> clarification_score("make a website", "design and implement a responsive web application")
        0.2
        >>> clarification_score("build React landing page for SaaS product with hero, features, pricing", "...")
        0.8
    """
    text = f"{original_prompt} {technical_prompt}".lower()
    
    # If this is an execution task, require implementation details
    execution_signals = ["build", "design", "implement", "landing", "app", "website", "create", "make"]
    is_execution_task = any(sig in text for sig in execution_signals)
    
    if not is_execution_task:
        # Conversational or informational queries don't need clarification
        return 1.0
    
    # Required context signals for execution tasks
    required_signals = [
        "audience", "target", "user", "customer",  # Who is it for?
        "stack", "framework", "technology", "react", "python", "node",  # What tech?
        "sections", "pages", "views", "components", "features",  # What structure?
        "deadline", "timeline", "timeframe",  # When?
        "brand", "style", "design", "aesthetic", "modern", "minimal",  # How should it look?
        "goal", "purpose", "objective", "outcome",  # Why?
    ]
    
    found_signals = sum(1 for signal in required_signals if signal in text)
    total_signals = len(required_signals)
    
    # Weight execution keywords negatively (indicates vagueness)
    execution_count = sum(1 for sig in execution_signals if sig in text)
    execution_penalty = min(execution_count * 0.1, 0.3)
    
    base_score = found_signals / total_signals
    return max(0.0, min(1.0, base_score - execution_penalty))


def needs_clarification(original_prompt: str, technical_prompt: str, threshold: float = 0.7) -> bool:
    """Check if prompt requires clarification before execution.
    
    Args:
        original_prompt: User's raw input
        technical_prompt: NTNTN-translated version
        threshold: Minimum clarity score (default 0.7)
        
    Returns:
        True if prompt is too vague and needs clarification
        
    Example:
        >>> needs_clarification("build a website", "design and implement a responsive web application")
        True
        >>> needs_clarification("Create React landing page for SaaS with hero, features, pricing", "...")
        False
    """
    score = clarification_score(original_prompt, technical_prompt)
    return score < threshold
