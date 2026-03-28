import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import AgentSetting from '@/components/agent-setting'
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import ChatMessageContent from '@/components/chat-message-content'
import AgentHeader from '@/components/header'
import { NtNtNAnalyzer } from '@/components/acheevy/ntntn-analyzer'
import PromptIntelligencePanel from '../../components/prompt-intelligence-panel'
import QuestionInput from '@/components/question-input'
import RightSidebar from '@/components/right-sidebar'
import Sidebar from '@/components/sidebar'
import ThinkingMessage from '@/components/thinking-message'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useChat } from '@/hooks/use-chat-query'
import {
    buildSessionSettingsEnvelope,
    getSessionSettingsEnvelope
} from '@/lib/session-context'
import { sessionService } from '@/services/session.service'
import { promptService, type EnhancePromptResponse } from '@/services/prompt.service'
import {
    selectCurrentMessageFileIds,
    selectIsLoading,
    selectSelectedModel,
    selectToolSettings,
    setSelectedModel,
    setQuestionMode,
    setToolSettings,
    useAppDispatch,
    useAppSelector
} from '@/state'
import { QUESTION_MODE } from '@/typings/agent'
import { FinishReason } from '@/typings/chat'
import { groupMessageParts } from '@/utils/chat-events'
import { useGoogleDrive } from '@/hooks/use-google-drive'

const getFinishReasonMessage = (finishReason: FinishReason): string | null => {
    switch (finishReason) {
        case FinishReason.MAX_TOKENS:
            return 'The response was stopped because it reached the maximum token limit.'
        case FinishReason.CANCELED:
            return 'The response was canceled.'
        case FinishReason.ERROR:
            return 'The response was stopped due to an error.'
        case FinishReason.PERMISSION_DENIED:
            return 'The response was stopped due to permission denial.'
        case FinishReason.PAUSE_TURN:
            return 'The conversation was paused. You can continue by sending another message.'
        case FinishReason.END_TURN:
        case FinishReason.TOOL_USE:
        case FinishReason.UNKNOWN:
        default:
            return null
    }
}

const TERMINOLOGY_ENGINE_STORAGE_KEY = 'acheevy-terminology-engine-enabled'

export function ChatPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const initialSessionId = searchParams.get('id')

    const location = useLocation()
    const navigateTo = useNavigate()
    const [isOpenSetting, setIsOpenSetting] = useState(false)
    const [filesCount, setFilesCount] = useState(0)
    const [composerDraft, setComposerDraft] = useState('')
    const [promptIntelligence, setPromptIntelligence] =
        useState<EnhancePromptResponse | null>(null)
    const [terminologyEngineEnabled, setTerminologyEngineEnabled] =
        useState(true)
    const dispatch = useAppDispatch()
    const selectedModelId = useAppSelector(selectSelectedModel)
    const toolSettings = useAppSelector(selectToolSettings)
    const currentMessageFileIds = useAppSelector(selectCurrentMessageFileIds)

    const {
        sessionId,
        setSessionId,
        sessionData,
        sessionError,
        messages,
        chatStatus,
        isHistoryLoading,
        isWaitingForNextEvent,
        showThinking,
        hydrateSessionHistory,
        resetConversationState,
        sendMessage,
        isSubmitting,
        stopActiveStream
    } = useChat()

    const {
        isConnected: isGoogleDriveConnected,
        isAuthLoading: isGoogleDriveAuthLoading,
        handleGoogleDriveClick,
        downloadedFiles: downloadedGoogleDriveFiles,
        clearDownloadedFiles
    } = useGoogleDrive()

    const isLoading = useAppSelector(selectIsLoading)
    const hydratedSnapshotSessionId = useRef('')
    const lastPersistedSnapshot = useRef('')

    // Group message parts for rendering
    const groupedMessages = useMemo(() => {
        return groupMessageParts(messages)
    }, [messages])

    const draftSessionSettings = useMemo(() => {
        if (!sessionId) {
            return null
        }

        return buildSessionSettingsEnvelope({
            sessionId,
            selectedModelId,
            speechOutputEnabled: toolSettings.audio_generation,
            terminologyEngineEnabled,
            attachmentIds: currentMessageFileIds,
            promptEnhancementEnabled: Boolean(promptIntelligence)
        })
    }, [
        currentMessageFileIds,
        promptIntelligence,
        selectedModelId,
        sessionId,
        terminologyEngineEnabled,
        toolSettings.audio_generation
    ])

    const selectedContextPackCount =
        draftSessionSettings?.session_context?.selected_context_pack_ids.length ?? 0

    const dataSourceSummary =
        selectedContextPackCount > 0
            ? `${selectedContextPackCount} context pack${selectedContextPackCount === 1 ? '' : 's'} selected for this session`
            : undefined

    // Get finish reason from the last message part
    const lastMessageFinishReason = useMemo(() => {
        if (groupedMessages.length === 0) return null
        const lastGroup = groupedMessages[groupedMessages.length - 1]
        if (!lastGroup.parts || lastGroup.parts.length === 0) return null
        const lastPart = lastGroup.parts[lastGroup.parts.length - 1]
        return lastPart.finish_reason || null
    }, [groupedMessages])

    // Set question mode to CHAT when the chat page loads
    useEffect(() => {
        dispatch(setQuestionMode(QUESTION_MODE.CHAT))
    }, [dispatch])

    useEffect(() => {
        setSessionId(initialSessionId)
    }, [initialSessionId, setSessionId])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const savedPreference = window.localStorage.getItem(
            TERMINOLOGY_ENGINE_STORAGE_KEY
        )
        if (savedPreference === 'false') {
            setTerminologyEngineEnabled(false)
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        window.localStorage.setItem(
            TERMINOLOGY_ENGINE_STORAGE_KEY,
            String(terminologyEngineEnabled)
        )
    }, [terminologyEngineEnabled])

    useEffect(() => {
        if (!sessionId) {
            resetConversationState()
            return
        }

        // Skip hydration if agent is already running (e.g., navigated from home page with active query)
        if (chatStatus === 'running') {
            return
        }

        hydrateSessionHistory(sessionId).catch((error) => {
            console.error('Failed to hydrate history', error)
        })
    }, [chatStatus, hydrateSessionHistory, resetConversationState, sessionId])

    useEffect(() => {
        if (!sessionId || !sessionData?.settings) {
            return
        }

        if (hydratedSnapshotSessionId.current === sessionId) {
            return
        }

        const envelope = getSessionSettingsEnvelope(sessionData.settings)
        if (!envelope) {
            hydratedSnapshotSessionId.current = sessionId
            return
        }

        hydratedSnapshotSessionId.current = sessionId

        const hydratedModelId = envelope.session_snapshot?.active_model_id
        if (hydratedModelId && hydratedModelId !== selectedModelId) {
            dispatch(setSelectedModel(hydratedModelId))
        }

        const hydratedSpeech = envelope.session_snapshot?.speech_output_enabled
        if (
            typeof hydratedSpeech === 'boolean' &&
            hydratedSpeech !== toolSettings.audio_generation
        ) {
            dispatch(
                setToolSettings({
                    ...toolSettings,
                    audio_generation: hydratedSpeech
                })
            )
        }

        const hydratedTerminology =
            envelope.build_spec?.terminology_engine_enabled
        if (typeof hydratedTerminology === 'boolean') {
            setTerminologyEngineEnabled(hydratedTerminology)
        }
    }, [
        dispatch,
        selectedModelId,
        sessionData?.settings,
        sessionId,
        toolSettings,
        toolSettings.audio_generation
    ])

    useEffect(() => {
        if (!sessionId || !draftSessionSettings) {
            return
        }

        const serializedSettings = JSON.stringify(draftSessionSettings)
        if (lastPersistedSnapshot.current === serializedSettings) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            sessionService
                .updateSession(sessionId, {
                    settings: draftSessionSettings
                })
                .then(() => {
                    lastPersistedSnapshot.current = serializedSettings
                })
                .catch((error: unknown) => {
                    console.error('Failed to persist session snapshot', error)
                })
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [draftSessionSettings, sessionId])

    const handleSend = useCallback(
        async (overrideQuestion?: string) => {
            await sendMessage(
                overrideQuestion,
                draftSessionSettings ?? undefined
            )
            setComposerDraft('')
        },
        [draftSessionSettings, sendMessage]
    )

    const handleEnhancePrompt = useCallback(
        async ({
            prompt,
            useTerminologyEngine,
            onSuccess
        }: {
            prompt: string
            useTerminologyEngine?: boolean
            onSuccess: (res: string, metadata?: EnhancePromptResponse) => void
        }) => {
            if (!prompt.trim()) {
                toast.error('Enter a directive before enhancing it.')
                return
            }

            try {
                const response = await promptService.enhancePrompt({
                    prompt,
                    context: sessionData?.name
                        ? `Current session: ${sessionData.name}`
                        : undefined,
                    use_terminology_engine: useTerminologyEngine ?? true
                })
                setPromptIntelligence(response)
                setComposerDraft(response.enhanced_prompt)
                onSuccess(response.enhanced_prompt, response)
                toast.success(
                    useTerminologyEngine
                        ? 'Directive upgraded with technical terminology.'
                        : 'Directive enhanced without terminology expansion.'
                )
            } catch (error) {
                console.error('Failed to enhance prompt', error)
                toast.error('Prompt enhancement failed. Please try again.')
            }
        },
        [sessionData?.name]
    )

    useEffect(() => {
        if (!composerDraft.trim()) {
            setPromptIntelligence(null)
        }
    }, [composerDraft])

    useEffect(() => {
        if (!terminologyEngineEnabled) {
            setPromptIntelligence(null)
        }
    }, [terminologyEngineEnabled])

    useEffect(() => {
        const rawState =
            (location.state as Record<string, unknown> | null) ?? null
        const pendingQuestion =
            typeof rawState?.pendingQuestion === 'string'
                ? (rawState.pendingQuestion as string)
                : undefined

        if (pendingQuestion) {
            handleSend(pendingQuestion)
            if (rawState) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { pendingQuestion: _ignored, ...rest } = rawState
                const nextState = Object.keys(rest).length > 0 ? rest : null
                navigateTo('.', { replace: true, state: nextState })
            } else {
                navigateTo('.', { replace: true, state: null })
            }
        }
    }, [handleSend, location.state, navigateTo])

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (!isSubmitting && chatStatus !== 'running') {
                    handleSend()
                }
            }
        },
        [chatStatus, handleSend, isSubmitting]
    )

    // Only update URL when a new session is created (not when loading existing session)
    // This prevents circular updates while allowing new session navigation
    useEffect(() => {
        // If we have a sessionId in state but no ID in URL, it means a new session was created
        if (sessionId && !initialSessionId) {
            setSearchParams({ id: sessionId })
        }
    }, [sessionId, initialSessionId, setSearchParams])

    return (
        <div
            className="relative flex h-dvh overflow-hidden bg-[#d8d7d4] text-[#1d1d1b] [--bg-base:#d8d7d4] [--bg-raised:#ffffff] [--bg-brand-subtle:#f0efeb] [--bg-brand-muted:#e6e3de] [--text-primary:#1d1d1b] [--text-secondary:#676661] [--text-tertiary:#92908a] [--text-brand:#1d1d1b] [--border-default:#d5d2cb] [--border-brand:#c7c3bb] [--border-brand-strong:#a9a59d]"
        >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0)_28%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_35%)]" />
            <SidebarProvider>
                <Sidebar />
                <div className="relative z-10 flex-1">
                    <AgentHeader sessionData={sessionData} isChatPage />
                    <div className="flex h-[calc(100dvh-64px)] justify-center overflow-hidden px-3 pb-3 pt-3 md:px-5 md:pb-5">
                        <div className="flex flex-1 max-w-[1100px] flex-col rounded-[18px] border border-[var(--border-default)] bg-[rgba(255,255,255,0.54)] shadow-[0_12px_36px_rgba(75,70,61,0.08)] py-3 md:py-4 px-3 md:px-4">
                            <Conversation
                                className={`flex-1${filesCount > 0 ? ' with-files' : ''}`}
                            >
                                <ConversationContent className="p-0 md:p-3">
                                    {isHistoryLoading && (
                                        <div className="flex items-center justify-center gap-2 py-12">
                                            <Loader size={20} />
                                            <span className="text-sm text-neutral-500">
                                                Loading conversation
                                                history&hellip;
                                            </span>
                                        </div>
                                    )}
                                    {sessionError && (
                                        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500 dark:text-red-300">
                                            {sessionError}
                                        </div>
                                    )}
                                    {!isHistoryLoading &&
                                        !sessionError &&
                                        messages.length === 0 && (
                                            <div className="mx-auto mt-10 flex max-w-3xl flex-col items-start gap-5 rounded-[16px] border border-[var(--border-default)] bg-white px-8 py-10 text-left shadow-[0_10px_28px_rgba(75,70,61,0.07)]">
                                                <div className="rounded-full border border-[var(--border-default)] bg-[#f4f3ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                                                    Chat Workspace
                                                </div>
                                                <div className="space-y-3">
                                                    <h2 className="text-[32px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                                                        Start with a directive
                                                    </h2>
                                                    <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                                                        Ask for research, implementation, system design, or prompt work. Keep the thread structured, attach files as needed, and use the terminology engine only when you want guided normalization.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                    {groupedMessages.map((group, index) => {
                                        // Check if this is the last group and agent is running
                                        const isLastGroup =
                                            index === groupedMessages.length - 1
                                        const isStreaming =
                                            isLastGroup &&
                                            chatStatus === 'running'

                                        return (
                                            <ChatMessageContent
                                                key={index}
                                                group={group}
                                                isStreaming={isStreaming}
                                                isWaitingForNextEvent={
                                                    isLastGroup &&
                                                    isWaitingForNextEvent
                                                }
                                            />
                                        )
                                    })}

                                    {showThinking && <ThinkingMessage />}

                                    {lastMessageFinishReason &&
                                        getFinishReasonMessage(
                                            lastMessageFinishReason
                                        ) && (
                                            <div className="rounded-[12px] border border-[#d9cfb6] bg-[#f6f2e7] p-3 text-sm text-[#5c5446]">
                                                {getFinishReasonMessage(
                                                    lastMessageFinishReason
                                                )}
                                            </div>
                                        )}
                                </ConversationContent>
                                <ConversationScrollButton />
                            </Conversation>

                            <div className="flex flex-col items-start gap-2 px-2 md:px-3">
                                <QuestionInput
                                    showComposerContract
                                    bezelLabel="CHAT W/ ACHEEVY"
                                    contextPackCount={selectedContextPackCount}
                                    dataSourceSummary={dataSourceSummary}
                                    hideSuggestions
                                    className="w-full max-w-none"
                                    textareaClassName="min-h-24 h-24 md:min-h-30 md:h-30 w-full"
                                    placeholder="Ask me anything..."
                                    value={composerDraft}
                                    setValue={setComposerDraft}
                                    handleKeyDown={handleKeyDown}
                                    handleSubmit={handleSend}
                                    handleEnhancePrompt={handleEnhancePrompt}
                                    hideFeatureSelector
                                    isDisabled={isLoading}
                                    hideModeSelector
                                    handleCancel={stopActiveStream}
                                    onOpenSetting={() => setIsOpenSetting(true)}
                                    onFilesChange={setFilesCount}
                                    onGoogleDriveClick={handleGoogleDriveClick}
                                    isGoogleDriveConnected={
                                        isGoogleDriveConnected
                                    }
                                    isGoogleDriveAuthLoading={
                                        isGoogleDriveAuthLoading
                                    }
                                    googleDriveFiles={
                                        downloadedGoogleDriveFiles
                                    }
                                    onGoogleDriveFilesHandled={
                                        clearDownloadedFiles
                                    }
                                    terminologyEngineEnabled={
                                        terminologyEngineEnabled
                                    }
                                    onTerminologyEngineChange={
                                        setTerminologyEngineEnabled
                                    }
                                />
                                {terminologyEngineEnabled && (
                                    <>
                                        <NtNtNAnalyzer
                                            inputText={composerDraft}
                                            className="mt-3"
                                        />
                                        <PromptIntelligencePanel
                                            data={promptIntelligence}
                                            className="mt-3"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarProvider>
            <RightSidebar />
            <AgentSetting
                isOpen={isOpenSetting}
                onOpenChange={setIsOpenSetting}
            />
        </div>
    )
}

export const Component = ChatPage
