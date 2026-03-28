export interface ContextPack {
    id: string
    name: string
    kind: string
    source_ids: string[]
    description?: string
}

export interface WorkingNotebook {
    id?: string
    context_pack_ids: string[]
    status: 'idle' | 'grounded' | 'composed'
}

export interface BuildSpec {
    intent?: string
    terminology_engine_enabled?: boolean
    prompt_enhancement_enabled?: boolean
    model_id?: string
}

export interface RoutingDecision {
    intent_type: string
    task_complexity: 'simple' | 'moderate' | 'complex'
    direct_ii_agent_capable: boolean
    platform_workflow_capable: boolean
    delegation_required: boolean
    research_level: 'none' | 'grounded' | 'deep'
    execution_lane:
        | 'direct_ii_agent'
        | 'platform_workflow'
        | 'delegated_execution'
}

export interface ChannelDispatchContext {
    provider: 'copaw'
    channel: string
    user_id: string
    thread_id?: string
}

export interface SessionSnapshot {
    version: number
    selected_context_pack_ids: string[]
    active_model_id?: string
    speech_output_enabled: boolean
    working_notebook_id?: string
    session_intent?: string
    attachment_ids: string[]
    channel_context?: ChannelDispatchContext
    updated_at: string
}

export interface SessionContext {
    context_packs: ContextPack[]
    selected_context_pack_ids: string[]
    working_notebook?: WorkingNotebook
}

export interface SessionSettingsEnvelope {
    session_snapshot?: SessionSnapshot
    session_context?: SessionContext
    build_spec?: BuildSpec
    routing_decision?: RoutingDecision
}