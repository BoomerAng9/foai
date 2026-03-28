import { useMemo, useState } from 'react'

import {
    ChainOfThought,
    ChainOfThoughtContent,
    ChainOfThoughtHeader,
    ChainOfThoughtStep
} from '@/components/ai-elements/chain-of-thought'
import { Response } from '@/components/ai-elements/response'
import {
    selectActiveSessionId,
    selectAvailableModels,
    useAppSelector
} from '@/state'
import { ContentPart, GroupedPart } from '@/utils/chat-events'
import { BrainIcon, Check, CodeIcon, Copy } from 'lucide-react'
import { MessageContent } from './ai-elements/message'
import DownloadFilesChat from './download-files-chat'
import { Button } from './ui/button'
import { ToolContentComponent } from './tool-content'
import { UploadedFilesDisplay } from './uploaded-files-display'

interface ChatMessageContentProps {
    group: GroupedPart
    isStreaming?: boolean
    isWaitingForNextEvent?: boolean
}

const ChatMessageContent = ({
    group,
    isStreaming = false,
    isWaitingForNextEvent = false
}: ChatMessageContentProps) => {
    const [isCopied, setIsCopied] = useState(false)
    const availableModels = useAppSelector(selectAvailableModels)
    const sessionId = useAppSelector(selectActiveSessionId)

    const handleCopyContent = async () => {
        const textContent = group.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('')

        if (textContent) {
            await navigator.clipboard.writeText(textContent)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        }
    }

    // Memoized map of tool_call_id to tool_result for O(1) lookups
    const toolResultsMap = useMemo(() => {
        const map = new Map<string, ContentPart>()

        // Add tool results from group parts
        group.parts.forEach((part) => {
            if (part.type === 'tool_result' && part.tool_call_id) {
                map.set(part.tool_call_id, part)
            }
        })

        return map
    }, [group.parts])

    // Helper function to find matching tool_result for a tool_call with O(1) lookup
    const findToolResult = (toolCallId: string): ContentPart | undefined => {
        return toolResultsMap.get(toolCallId)
    }

    // Don't render if group has no parts
    if (!group.parts || group.parts.length === 0) {
        return null
    }

    // Extract metadata from the first part (all parts from the same message have same metadata)
    const firstPart = group.parts[0]
    const role = firstPart?.role || 'assistant'

    if (role === 'tool') return null

    return (
        <div
            className={`rounded-lg text-base ${
                role === 'user'
                    ? 'flex flex-col items-end justify-end gap-2'
                    : role === 'system'
                      ? 'p-3 border border-[var(--chat-system-border)] bg-[var(--chat-system-bg)] rounded-xl italic w-full text-[var(--text-secondary)]'
                      : 'text-[var(--text-primary)] w-full'
            }`}
        >
            {role === 'user' ? (
                <>
                    <UploadedFilesDisplay
                        files={group.files}
                        fileContents={group.fileContents}
                        sessionId={sessionId || undefined}
                    />
                    <div className="relative mb-7 w-fit max-w-[85%] rounded-[14px] border border-[var(--border-default)] bg-[#f3f1ed] px-4 py-3 text-[var(--text-primary)] whitespace-pre-wrap shadow-[0_6px_18px_rgba(75,70,61,0.06)]">
                        <div>
                            {group.parts
                                .filter((part) => part.type === 'text')
                                .map((part) => part.text)
                                .join('')}
                        </div>
                        <div className="absolute -bottom-7 right-1 flex items-center justify-end gap-2 text-[var(--text-tertiary)]">
                            <span className="type-body-xs w-max text-[var(--text-tertiary)]">
                                {group.parts[0]?.model
                                    ? availableModels.find(
                                          (m) => m.id === group.parts[0].model
                                      )?.model
                                    : ''}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-4 text-[10px] cursor-pointer text-[var(--text-tertiary)]"
                                onClick={handleCopyContent}
                            >
                                {isCopied ? (
                                    <Check className="size-3" />
                                ) : (
                                    <Copy className="size-3" />
                                )}
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <MessageContent variant="flat" className="p-0">
                    {(() => {
                        // Check if group has text parts
                        const hasTextPart = group.parts.some(
                            (part) => part.type === 'text'
                        )
                        const isLastOfTurn = group.parts.some(
                            (part) => part.isLastOfTurn
                        )

                        if (hasTextPart) {
                            // Render text directly
                            return (
                                <div className="group mb-5 rounded-[16px] border border-[var(--border-default)] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(75,70,61,0.07)]">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-8 items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[#f4f3ef] text-[11px] font-semibold text-[var(--text-secondary)]">AI</div>
                                            <div className="flex flex-col leading-none">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Agent</span>
                                                <span className="type-body-xs text-[var(--text-tertiary)]">Response</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Response>
                                        {group.parts
                                            .filter(
                                                (part) => part.type === 'text'
                                            )
                                            .map((part) => part.text)
                                            .join('')}
                                    </Response>
                                    {isLastOfTurn && (
                                        <DownloadFilesChat
                                            files={group.files || []}
                                            sessionId={sessionId || ''}
                                        />
                                    )}
                                    {isLastOfTurn && !isStreaming && (
                                        <div className="mt-3 flex items-center justify-start gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-6 p-0 text-xs cursor-pointer rounded-full border border-[var(--border-default)] text-[var(--text-tertiary)] hover:!bg-[#f3f1ed]"
                                                onClick={handleCopyContent}
                                            >
                                                {isCopied ? (
                                                    <Check className="size-3" />
                                                ) : (
                                                    <Copy className="size-3" />
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        // No text parts - render as ChainOfThought
                        const chainParts = group.parts

                        return (
                            <ChainOfThought
                                isStreaming={isStreaming}
                                className="mb-4 rounded-[16px] border border-[var(--border-default)] bg-[#fbfaf8] px-5 py-4 shadow-[0_8px_24px_rgba(75,70,61,0.06)]"
                            >
                                <ChainOfThoughtHeader />
                                <ChainOfThoughtContent>
                                    {chainParts.map((part, partIndex) => {
                                        if (part.type === 'reasoning') {
                                            const reasoningPart = part as {
                                                type: 'reasoning'
                                                id?: string
                                                thinking?: string
                                                started_at?: number | null
                                                finished_at?: number | null
                                                stream_active?: boolean
                                            }

                                            const isThisPartStreaming =
                                                reasoningPart.stream_active ===
                                                true

                                            let duration: number | undefined
                                            if (
                                                reasoningPart.started_at &&
                                                reasoningPart.finished_at
                                            ) {
                                                duration = Math.ceil(
                                                    (reasoningPart.finished_at -
                                                        reasoningPart.started_at) /
                                                        1000
                                                )
                                            }

                                            return (
                                                <ChainOfThoughtStep
                                                    key={
                                                        reasoningPart.id ??
                                                        partIndex
                                                    }
                                                    icon={BrainIcon}
                                                    label={
                                                        isThisPartStreaming
                                                            ? 'Thinking...'
                                                            : `Thinking${duration ? ` (${duration}s)` : ''}`
                                                    }
                                                    status={
                                                        isThisPartStreaming
                                                            ? 'active'
                                                            : 'complete'
                                                    }
                                                >
                                                    <Response className="text-black/56 dark:text-grey-2">
                                                        {reasoningPart.thinking ||
                                                            ''}
                                                    </Response>
                                                </ChainOfThoughtStep>
                                            )
                                        }
                                        if (part.type === 'tool_call') {
                                            const toolResult = findToolResult(
                                                part.id || ''
                                            )
                                            return (
                                                <ToolContentComponent
                                                    key={partIndex}
                                                    toolCall={part}
                                                    toolResult={toolResult}
                                                />
                                            )
                                        }

                                        if (part.type === 'code_block') {
                                            return (
                                                <ChainOfThoughtStep
                                                    key={part.id ?? partIndex}
                                                    icon={CodeIcon}
                                                    label={'Code Interpreter'}
                                                    status={'complete'}
                                                >
                                                    <Response
                                                        key={`code-block-${part.id}`}
                                                    >
                                                        {`\`\`\`python\n${part.content}\n\`\`\``}
                                                    </Response>
                                                </ChainOfThoughtStep>
                                            )
                                        }
                                        return null
                                    })}
                                    {isWaitingForNextEvent && (
                                        <ChainOfThoughtStep
                                            icon={BrainIcon}
                                            label="Thinking..."
                                            status="active"
                                        />
                                    )}
                                </ChainOfThoughtContent>
                            </ChainOfThought>
                        )
                    })()}
                </MessageContent>
            )}
        </div>
    )
}

export default ChatMessageContent
