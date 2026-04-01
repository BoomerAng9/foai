"""
MCP Tool Definitions — Maps the FOAI agent workforce to MCP-compliant tools.

Each Boomer_Ang and key Lil_Hawk is an MCP tool. Tool names, descriptions,
and input schemas derive from the existing role cards.

GRAMMAR and Tech Lang Index are also exposed as tools.
"""

BOOMER_ANG_TOOLS = [
    {
        "name": "acheevy_delegate",
        "description": "ACHEEVY Digital CEO. Strategic decisions, agent deployment, org-wide oversight. Use this when the task requires cross-agent coordination or executive judgment. ACHEEVY routes to the appropriate Boomer_Ang or Lil_Hawk.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {
                    "type": "string",
                    "description": "Executive-level task. e.g., 'Plan and execute a complete marketing campaign for our Q2 launch'",
                },
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "scout_ang_research",
        "description": "Research analyst agent. Web scraping, opportunity sourcing, institutional contract discovery, data intelligence. Uses Firecrawl + Apify. Remembers past research via semantic memory.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {
                    "type": "string",
                    "description": "Natural language research task. e.g., 'Find universities in Georgia with open seats for Q2 2026'",
                },
                "urgency": {
                    "type": "string",
                    "enum": ["low", "normal", "high"],
                    "default": "normal",
                },
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "content_ang_create",
        "description": "Content marketing agent. SEO content generation, keyword strategy with memory-informed optimization, blog posts, landing pages, social content.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {
                    "type": "string",
                    "description": "Content creation task. e.g., 'Write 3 SEO blog posts about AI automation targeting startup founders'",
                },
                "content_type": {
                    "type": "string",
                    "enum": ["blog", "landing_page", "social", "email", "newsletter"],
                    "default": "blog",
                },
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "edu_ang_enroll",
        "description": "Sales agent. Enrollment generation, affiliate link management, revenue attribution, commission tracking. Handles education sales pipeline.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {
                    "type": "string",
                    "description": "Sales task. e.g., 'Generate enrollment campaign for Python bootcamp targeting career changers'",
                },
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "biz_ang_pipeline",
        "description": "Business development agent. Growth dashboards, pipeline analytics, lead generation, client retention tracking, campaign performance analysis.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {
                    "type": "string",
                    "description": "Biz dev task. e.g., 'Analyze Q1 pipeline and identify top 5 leads by conversion probability'",
                },
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "ops_ang_monitor",
        "description": "Operations agent. 24/7 fleet health monitoring, automated incident detection, service uptime tracking, historical incident recall from memory.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {
                    "type": "string",
                    "description": "Ops task. e.g., 'Run health check on all services and report any degradation in the last 24 hours'",
                },
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "iller_ang_create",
        "description": "Creative Director agent. Produces visual assets: player cards (4 styles), broadcast graphics, recruiting predictions, team composites, character illustrations, agent character art, podcast/media visuals, merchandise concepts, profile/NFT cards, digital art, cinematic game shots, motion landing pages. Use for any visual content request.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {
                    "type": "string",
                    "description": "Visual asset request. e.g., 'Create a silver border player card for quarterback #7 Comets, night game action shot'",
                },
                "asset_type": {
                    "type": "string",
                    "enum": ["player_card", "broadcast", "recruiting", "composite", "character", "agent_art", "podcast", "merchandise", "profile_card", "digital_art", "cinematic", "lifestyle", "motion_page"],
                    "default": "player_card",
                },
            },
            "required": ["instruction"],
        },
    },
]

LIL_HAWK_TOOLS = [
    {
        "name": "lil_coding_hawk",
        "description": "Software engineer. Plan-first, approval-gated feature development. Spawned by Chicken Hawk.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Coding task with clear requirements"},
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "lil_trae_hawk",
        "description": "Senior developer. Large refactors, repo-wide changes, heavy coding. Spawned by Chicken Hawk.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Heavy development task"},
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "lil_deep_hawk",
        "description": "Project lead. Multi-agent coordination, squad mode. DeerFlow 2.0 powered. For complex multi-step tasks requiring multiple specialists.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Complex multi-step task requiring coordination"},
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "lil_agent_hawk",
        "description": "OS-level, browser, and multi-CLI workflow automation. File operations, web scraping, system commands.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Automation or system task"},
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "lil_flow_hawk",
        "description": "SaaS/CRM/email/payment automation via n8n. Webhook orchestration, API integrations.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Automation workflow task"},
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "lil_memory_hawk",
        "description": "Long-term RAG memory. Semantic search, knowledge base management, conversation history.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Memory or knowledge retrieval task"},
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "lil_back_hawk",
        "description": "Backend scaffolding. Auth systems, APIs, database schemas, server infrastructure.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Backend engineering task"},
            },
            "required": ["instruction"],
        },
    },
    {
        "name": "lil_viz_hawk",
        "description": "Monitoring dashboards, data visualization, real-time metrics displays.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "instruction": {"type": "string", "description": "Visualization or dashboard task"},
            },
            "required": ["instruction"],
        },
    },
]

# GRAMMAR — Structured prompt generation from natural language
GRAMMAR_TOOLS = [
    {
        "name": "grammar_convert",
        "description": "GRAMMAR engine. Converts plain-language requests into structured technical prompts. Takes a casual description and outputs a precise, copy-pasteable prompt block with context, constraints, format, and success criteria.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "request": {
                    "type": "string",
                    "description": "Plain-language description of what you want. e.g., 'I need a landing page for my SaaS that converts well'",
                },
                "target_system": {
                    "type": "string",
                    "enum": ["claude", "gpt", "gemini", "cursor", "v0", "bolt", "generic"],
                    "default": "generic",
                    "description": "Which AI system the generated prompt is optimized for",
                },
                "detail_level": {
                    "type": "string",
                    "enum": ["brief", "standard", "comprehensive"],
                    "default": "standard",
                },
            },
            "required": ["request"],
        },
    },
]

# Tech Lang Index — Language/framework capability catalog
TECH_LANG_INDEX_TOOLS = [
    {
        "name": "tech_lang_lookup",
        "description": "Tech Lang Index. Query the platform's supported languages, frameworks, runtimes, and their capabilities. Returns what each technology can do within the FOAI ecosystem, which agents specialize in it, and recommended patterns.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Technology to look up. e.g., 'Python', 'Next.js', 'Rust', 'Docker'",
                },
                "context": {
                    "type": "string",
                    "enum": ["capabilities", "agents", "patterns", "all"],
                    "default": "all",
                    "description": "What aspect of the technology to return",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "tech_lang_recommend",
        "description": "Tech Lang Recommender. Given a project description, recommends the optimal tech stack and which FOAI agents can build it. Returns language, framework, infrastructure, and agent assignment recommendations.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_description": {
                    "type": "string",
                    "description": "What you're building. e.g., 'A real-time chat app with video calling and file sharing'",
                },
                "constraints": {
                    "type": "string",
                    "description": "Optional constraints. e.g., 'Must run on Cloudflare Workers, budget under $50/mo'",
                },
            },
            "required": ["project_description"],
        },
    },
]

# Subscription tier tool access
TIER_ACCESS = {
    "starter": {
        "tools": ["acheevy_delegate", "scout_ang_research", "content_ang_create", "edu_ang_enroll",
                   "grammar_convert", "tech_lang_lookup", "tech_lang_recommend"],
        "price": 497,
    },
    "growth": {
        "tools": ["acheevy_delegate", "scout_ang_research", "content_ang_create", "edu_ang_enroll",
                   "biz_ang_pipeline", "ops_ang_monitor",
                   "lil_coding_hawk", "lil_trae_hawk", "lil_deep_hawk", "lil_agent_hawk",
                   "lil_flow_hawk", "lil_memory_hawk", "lil_back_hawk", "lil_viz_hawk",
                   "iller_ang_create",
                   "grammar_convert", "tech_lang_lookup", "tech_lang_recommend"],
        "price": 1497,
    },
    "enterprise": {
        "tools": "*",  # All tools
        "price": 4997,
    },
    # Individual agent pricing for PlugMeIn marketplace
    "plugmein_scout": {"tools": ["scout_ang_research"], "price": 97},
    "plugmein_content": {"tools": ["content_ang_create"], "price": 127},
    "plugmein_biz": {"tools": ["biz_ang_pipeline"], "price": 97},
    "plugmein_edu": {"tools": ["edu_ang_enroll"], "price": 147},
    "plugmein_ops": {"tools": ["ops_ang_monitor"], "price": 197},
    "plugmein_iller": {"tools": ["iller_ang_create"], "price": 197},
}

ALL_TOOLS = BOOMER_ANG_TOOLS + LIL_HAWK_TOOLS + GRAMMAR_TOOLS + TECH_LANG_INDEX_TOOLS


def get_tools_for_tier(tier: str) -> list[dict]:
    """Return the MCP tool catalog filtered by subscription tier."""
    access = TIER_ACCESS.get(tier)
    if not access:
        return []
    if access["tools"] == "*":
        return ALL_TOOLS
    allowed = set(access["tools"])
    return [t for t in ALL_TOOLS if t["name"] in allowed]
