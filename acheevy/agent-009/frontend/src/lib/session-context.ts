import type {
    BuildSpec,
    ContextPack,
    RoutingDecision,
    SessionSettingsEnvelope,
    SessionSnapshot,
    WorkingNotebook
} from '@/typings/session-context'

export const TECHNICAL_KNOWLEDGE_INDEX_CONTEXT_PACK_ID =
    'technical-knowledge-index'
export const LAY_TO_TECHNICAL_LEXICON_CONTEXT_PACK_ID =
    'lay-to-technical-lexicon'

type DraftSessionSettingsInput = {
    sessionId: string
    selectedModelId?: string
    speechOutputEnabled: boolean
    terminologyEngineEnabled: boolean
    attachmentIds: string[]
    promptEnhancementEnabled: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function asSessionSnapshot(value: Record<string, unknown>) {
    return value as unknown as SessionSnapshot
}

function asSessionContext(value: Record<string, unknown>) {
    return value as unknown as SessionSettingsEnvelope['session_context']
}

function asRoutingDecision(value: Record<string, unknown>) {
    return value as unknown as RoutingDecision
}

function createAttachmentContextPacks(attachmentIds: string[]): ContextPack[] {
    return attachmentIds.map((attachmentId) => ({
        id: `attachment:${attachmentId}`,
        name: `Attached Source ${attachmentId.slice(0, 8)}`,
        kind: 'source-pack',
        source_ids: [attachmentId]
    }))
}

export function buildSessionSettingsEnvelope({
    sessionId,
    selectedModelId,
    speechOutputEnabled,
    terminologyEngineEnabled,
    attachmentIds,
    promptEnhancementEnabled
}: DraftSessionSettingsInput): SessionSettingsEnvelope {
    const terminologyContextPacks: ContextPack[] = terminologyEngineEnabled
        ? [
              {
                  id: TECHNICAL_KNOWLEDGE_INDEX_CONTEXT_PACK_ID,
                  name: 'Technical Knowledge Index',
                  kind: 'terminology-pack',
                  source_ids: ['technical-knowledge-index']
              },
              {
                  id: LAY_TO_TECHNICAL_LEXICON_CONTEXT_PACK_ID,
                  name: 'Lay-to-Technical Lexicon',
                  kind: 'terminology-pack',
                  source_ids: ['lay-to-technical-lexicon']
              }
          ]
        : []

    const attachmentContextPacks = createAttachmentContextPacks(attachmentIds)
    const contextPacks = [...terminologyContextPacks, ...attachmentContextPacks]
    const selectedContextPackIds = contextPacks.map((pack) => pack.id)

    const workingNotebook: WorkingNotebook = {
        id: `working-notebook:${sessionId}`,
        context_pack_ids: selectedContextPackIds,
        status: selectedContextPackIds.length > 0 ? 'grounded' : 'idle'
    }

    const sessionSnapshot: SessionSnapshot = {
        version: 1,
        selected_context_pack_ids: selectedContextPackIds,
        active_model_id: selectedModelId,
        speech_output_enabled: speechOutputEnabled,
        working_notebook_id: workingNotebook.id,
        session_intent: 'chat',
        attachment_ids: attachmentIds,
        updated_at: new Date().toISOString()
    }

    const buildSpec: BuildSpec = {
        intent: 'chat',
        terminology_engine_enabled: terminologyEngineEnabled,
        prompt_enhancement_enabled: promptEnhancementEnabled,
        model_id: selectedModelId
    }

    const routingDecision: RoutingDecision = {
        intent_type: 'chat',
        task_complexity: 'simple',
        direct_ii_agent_capable: true,
        platform_workflow_capable: false,
        delegation_required: false,
        research_level: attachmentIds.length > 0 ? 'grounded' : 'none',
        execution_lane: 'direct_ii_agent'
    }

    return {
        session_snapshot: sessionSnapshot,
        session_context: {
            context_packs: contextPacks,
            selected_context_pack_ids: selectedContextPackIds,
            working_notebook: workingNotebook
        },
        build_spec: buildSpec,
        routing_decision: routingDecision
    }
}

export function getSessionSettingsEnvelope(
    settings: unknown
): SessionSettingsEnvelope | null {
    if (!isRecord(settings)) {
        return null
    }

    const envelope: SessionSettingsEnvelope = {}

    if (isRecord(settings.session_snapshot)) {
        envelope.session_snapshot = asSessionSnapshot(settings.session_snapshot)
    }

    if (isRecord(settings.session_context)) {
        envelope.session_context = asSessionContext(settings.session_context)
    }

    if (isRecord(settings.build_spec)) {
        envelope.build_spec = settings.build_spec as BuildSpec
    }

    if (isRecord(settings.routing_decision)) {
        envelope.routing_decision = asRoutingDecision(settings.routing_decision)
    }

    return envelope.session_snapshot ||
        envelope.session_context ||
        envelope.build_spec ||
        envelope.routing_decision
        ? envelope
        : null
}