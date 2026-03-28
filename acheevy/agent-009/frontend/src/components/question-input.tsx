import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'

import { Textarea } from './ui/textarea'
import { useUploadFiles, type FileUploadStatus } from '@/hooks/use-upload-files'
import FilesPreview from './question-files-preview'
import Suggestions from './question-suggestions'
import FeatureSelector from './question-feature-selector'
import ModeSelector from './question-mode-selector'
import EnhanceButton from './question-enhance-button'
import SubmitButton from './question-submit-button'
import QuestionFileUpload from './question-file-upload'
import { SlideTemplateSelector } from './slide-template-selector'
import { type SlideTemplate } from '@/services/slide.service'
import {
    selectRequireClearFiles,
    setRequireClearFiles,
    selectSelectedFeature,
    setSelectedFeature,
    selectShouldFocusInput,
    setShouldFocusInput,
    setSelectedSlideTemplate,
    selectSelectedSlideTemplate,
    selectQuestionMode,
    setQuestionMode,
    setToolSettings,
    useAppDispatch,
    useAppSelector,
    selectSelectedModel,
    selectAvailableModels,
    addUploadedFiles,
    addToCurrentMessageFileIds
} from '@/state'
import { AGENT_TYPE, QUESTION_MODE } from '@/typings'
import { FEATURES } from '@/constants/tool'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import { Switch } from './ui/switch'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './ui/dropdown-menu'
import { isImageFile } from '@/lib/utils'
import type { DownloadedFile } from '@/services/connector.service'
import type { EnhancePromptResponse } from '@/services/prompt.service'

interface SpeechRecognitionResult {
    isFinal: boolean
    0: {
        transcript: string
    }
}

interface SpeechRecognitionEvent extends Event {
    results: ArrayLike<SpeechRecognitionResult>
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string
}

interface BrowserSpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    onstart: ((this: BrowserSpeechRecognition, ev: Event) => void) | null
    onend: ((this: BrowserSpeechRecognition, ev: Event) => void) | null
    onresult:
        | ((
              this: BrowserSpeechRecognition,
              ev: SpeechRecognitionEvent
          ) => void)
        | null
    onerror:
        | ((
              this: BrowserSpeechRecognition,
              ev: SpeechRecognitionErrorEvent
          ) => void)
        | null
    start: () => void
    stop: () => void
}

const SPEECH_OUTPUT_STORAGE_KEY = 'acheevy-speech-output-enabled'

interface QuestionInputProps {
    value: string
    setValue?: (value: string) => void
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
    handleSubmit: (question: string) => void
    className?: string
    textareaClassName?: string
    placeholder?: string
    isDisabled?: boolean
    handleEnhancePrompt?: (payload: {
        prompt: string
        useTerminologyEngine?: boolean
        onSuccess: (res: string, metadata?: EnhancePromptResponse) => void
    }) => void
    handleCancel?: () => void
    onFilesChange?: (filesCount: number) => void
    hideSuggestions?: boolean
    hideFeatureSelector?: boolean
    hideModeSelector?: boolean
    onOpenSetting?: () => void
    onGoogleDriveClick?: () => void
    isGoogleDriveConnected?: boolean
    isGoogleDriveAuthLoading?: boolean
    googleDriveFiles?: DownloadedFile[]
    onGoogleDriveFilesHandled?: () => void
    terminologyEngineEnabled?: boolean
    onTerminologyEngineChange?: (enabled: boolean) => void
    showComposerContract?: boolean
    bezelLabel?: string
    contextPackCount?: number
    dataSourceSummary?: string
}

const QuestionInput = ({
    className,
    textareaClassName,
    placeholder,
    value,
    setValue,
    handleKeyDown,
    handleSubmit,
    isDisabled,
    handleEnhancePrompt,
    handleCancel,
    onFilesChange,
    hideSuggestions,
    hideFeatureSelector,
    hideModeSelector,
    onOpenSetting,
    onGoogleDriveClick,
    isGoogleDriveConnected,
    isGoogleDriveAuthLoading,
    googleDriveFiles,
    onGoogleDriveFilesHandled,
    terminologyEngineEnabled = true,
    onTerminologyEngineChange,
    showComposerContract = false,
    bezelLabel = 'CHAT W/ ACHEEVY',
    contextPackCount = 0,
    dataSourceSummary
}: QuestionInputProps) => {
    const dispatch = useAppDispatch()
    const requireClearFiles = useAppSelector(selectRequireClearFiles)
    const selectedFeature = useAppSelector(selectSelectedFeature)
    const shouldFocusInput = useAppSelector(selectShouldFocusInput)
    const selectedSlideTemplate = useAppSelector(selectSelectedSlideTemplate)
    const questionMode = useAppSelector(selectQuestionMode)
    const availableModels = useAppSelector(selectAvailableModels)
    const selectedModel = useAppSelector(selectSelectedModel)
    const toolSettings = useAppSelector((state) => state.settings.toolSettings)
    const selectedModelName =
        availableModels.find((model) => model.id === selectedModel)?.model ||
        'Model'
    const isUploading = useAppSelector((state) => state.files.isUploading)
    const isLoading = useAppSelector((state) => state.ui.isLoading)
    const isGeneratingPrompt = useAppSelector(
        (state) => state.ui.isGeneratingPrompt
    )
    const isCreatingSession = useAppSelector(
        (state) => state.ui.isCreatingSession
    )
    const { sessionId } = useParams()

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
    const speechPreferenceHydratedRef = useRef(false)

    const [files, setFiles] = useState<FileUploadStatus[]>([])
    const [currentTextareaValue, setCurrentTextareaValue] = useState(value)
    const [showTemplateSelector, setShowTemplateSelector] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isVoiceCaptureSupported, setIsVoiceCaptureSupported] =
        useState(false)

    const {
        handleRemoveFile,
        handleFileUploadWithSignedUrl,
        handlePastedImageUpload
    } = useUploadFiles()

    const removeFile = (fileName: string) => {
        handleRemoveFile(fileName)
        setFiles((prev) => prev.filter((file) => file.name !== fileName))
    }

    // Handle key down events with auto-scroll for Shift+Enter
    const handleKeyDownWithAutoScroll = (
        e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
        if (
            !currentTextareaValue.trim() ||
            isDisabled ||
            isCreatingSession ||
            files?.some((file) => file.loading) ||
            isUploading
        )
            return

        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Check if cursor is at the last line before allowing default behavior
                const textarea = textareaRef.current
                if (textarea) {
                    const cursorPosition = textarea.selectionStart
                    const text = textarea.value

                    // Check if cursor is at or near the end of the text
                    const isAtLastLine = !text
                        .substring(cursorPosition)
                        .includes('\n')

                    // Allow default behavior for Shift+Enter (new line)
                    // Only schedule auto-scroll if we're at the last line
                    if (isAtLastLine) {
                        setTimeout(() => {
                            if (textarea) {
                                textarea.scrollTop = textarea.scrollHeight
                            }
                        }, 0)
                    }
                }
            } else {
                // For Enter key, get current value from textarea and pass to handleSubmit
                e.preventDefault()
                const currentValue = textareaRef.current?.value || ''
                if (currentValue.trim()) {
                    handleSubmit(currentValue)
                    // Clear the textarea after submission
                    if (textareaRef.current) {
                        textareaRef.current.value = ''
                        setCurrentTextareaValue('')
                    }
                }
            }
        } else {
            // Pass other key events to the original handler, but modify to work with uncontrolled input
            const modifiedEvent = {
                ...e,
                target: {
                    ...e.target,
                    value: textareaRef.current?.value || ''
                }
            } as React.KeyboardEvent<HTMLTextAreaElement>
            handleKeyDown(modifiedEvent)
        }
    }

    const handleFileChange = async (filesToUpload: File[]) => {
        await handleFileUploadWithSignedUrl(filesToUpload, setFiles)
    }

    // Handle drag and drop events
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true)
        }
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        // Only set isDragging to false if we're leaving the main container
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const x = e.clientX
        const y = e.clientY
        if (
            x <= rect.left ||
            x >= rect.right ||
            y <= rect.top ||
            y >= rect.bottom
        ) {
            setIsDragging(false)
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)

            if (isDisabled || isUploading || isCreatingSession) {
                return
            }

            const droppedFiles = Array.from(e.dataTransfer.files)
            if (droppedFiles.length > 0) {
                await handleFileUploadWithSignedUrl(droppedFiles, setFiles)
            }
        },
        [
            isDisabled,
            isUploading,
            isCreatingSession,
            handleFileUploadWithSignedUrl
        ]
    )

    // Handle clipboard paste (images upload + keep caret in view)
    const handlePaste = useCallback(
        async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
            const clipboardItems = e.clipboardData?.items
            if (!clipboardItems) return

            const imageItems = Array.from(clipboardItems).filter((item) =>
                item.type.startsWith('image/')
            )

            if (imageItems.length > 0) {
                // Prevent default paste behavior for images
                e.preventDefault()

                for (const item of imageItems) {
                    const file = item.getAsFile()
                    if (!file) continue

                    // Generate a unique filename for the pasted image
                    const timestamp = Date.now()
                    const extension = file.type.split('/')[1] || 'png'
                    const fileName = `pasted-image-${timestamp}.${extension}`

                    // Create a new File object with the generated name
                    const renamedFile = new File([file], fileName, {
                        type: file.type
                    })

                    await handlePastedImageUpload(
                        renamedFile,
                        fileName,
                        setFiles
                    )
                }
            }

            // Scroll to the end after text paste so the caret stays in view
            setTimeout(() => {
                const textarea = textareaRef.current
                if (!textarea) return
                textarea.scrollTop = textarea.scrollHeight
                setCurrentTextareaValue(textarea.value)
            }, 0)
        },
        [handlePastedImageUpload, setFiles]
    )

    const handleSelectFeature = (type: string) => {
        if (type === AGENT_TYPE.SLIDE) {
            // Show template selector instead of immediately setting the agent type
            setShowTemplateSelector(true)
        } else {
            dispatch(setSelectedFeature(type))
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 300)
        }
    }

    const handleSelectMode = (mode: QUESTION_MODE) => {
        dispatch(setQuestionMode(mode))
        setTimeout(() => {
            textareaRef.current?.focus()
        }, 300)
    }

    const removeFeature = () => {
        dispatch(setSelectedFeature(AGENT_TYPE.GENERAL))
        dispatch(setSelectedSlideTemplate(null))
    }

    const handleTemplateSelect = (template: SlideTemplate | null) => {
        dispatch(setSelectedSlideTemplate(template))
        setShowTemplateSelector(false)
        dispatch(setSelectedFeature(AGENT_TYPE.SLIDE))

        setTimeout(() => {
            textareaRef.current?.focus()
        }, 300)
    }

    const handleTemplateSelectorClose = () => {
        setShowTemplateSelector(false)
    }

    const handleSpeechOutputChange = useCallback(
        (enabled: boolean) => {
            dispatch(
                setToolSettings({
                    ...toolSettings,
                    audio_generation: enabled
                })
            )
        },
        [dispatch, toolSettings]
    )

    const toggleVoiceCapture = useCallback(() => {
        if (!recognitionRef.current) {
            toast.error('Voice capture is not available in this browser.')
            return
        }

        if (isListening) {
            recognitionRef.current.stop()
            return
        }

        recognitionRef.current.start()
    }, [isListening])

    useEffect(() => {
        if (onFilesChange) {
            onFilesChange(files.length)
        }
    }, [files, onFilesChange])

    useEffect(() => {
        if (!showComposerContract || typeof window === 'undefined') {
            return
        }

        const speechWindow = window as Window & {
            SpeechRecognition?: new () => BrowserSpeechRecognition
            webkitSpeechRecognition?: new () => BrowserSpeechRecognition
        }

        const SpeechRecognitionCtor =
            speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition

        if (!SpeechRecognitionCtor) {
            setIsVoiceCaptureSupported(false)
            return
        }

        const speechRecognition =
            new SpeechRecognitionCtor() as BrowserSpeechRecognition
        speechRecognition.continuous = true
        speechRecognition.interimResults = true
        speechRecognition.lang = 'en-US'

        speechRecognition.onstart = () => {
            setIsListening(true)
        }

        speechRecognition.onend = () => {
            setIsListening(false)
        }

        speechRecognition.onresult = (event) => {
            let finalTranscript = ''

            for (const result of Array.from(event.results)) {
                if (result.isFinal) {
                    finalTranscript += result[0]?.transcript ?? ''
                }
            }

            if (!finalTranscript) {
                return
            }

            const nextValue = [
                textareaRef.current?.value ?? currentTextareaValue,
                finalTranscript.trim()
            ]
                .filter(Boolean)
                .join(' ')
                .trim()

            if (textareaRef.current) {
                textareaRef.current.value = nextValue
                textareaRef.current.dispatchEvent(
                    new Event('input', { bubbles: true })
                )
            }

            setCurrentTextareaValue(nextValue)
            setValue?.(nextValue)
        }

        speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error)
            setIsListening(false)
            toast.error('Voice capture failed. Please try again.')
        }

        recognitionRef.current = speechRecognition
        setIsVoiceCaptureSupported(true)

        return () => {
            recognitionRef.current?.stop()
            recognitionRef.current = null
        }
    }, [currentTextareaValue, setValue, showComposerContract])

    useEffect(() => {
        if (
            !showComposerContract ||
            speechPreferenceHydratedRef.current ||
            typeof window === 'undefined'
        ) {
            return
        }

        speechPreferenceHydratedRef.current = true

        const savedPreference = window.localStorage.getItem(
            SPEECH_OUTPUT_STORAGE_KEY
        )

        if (savedPreference === null) {
            if (!toolSettings.audio_generation) {
                dispatch(
                    setToolSettings({
                        ...toolSettings,
                        audio_generation: true
                    })
                )
            }
            return
        }

        const shouldEnableSpeech = savedPreference === 'true'
        if (toolSettings.audio_generation !== shouldEnableSpeech) {
            dispatch(
                setToolSettings({
                    ...toolSettings,
                    audio_generation: shouldEnableSpeech
                })
            )
        }
    }, [dispatch, showComposerContract, toolSettings])

    useEffect(() => {
        if (
            !showComposerContract ||
            !speechPreferenceHydratedRef.current ||
            typeof window === 'undefined'
        ) {
            return
        }

        window.localStorage.setItem(
            SPEECH_OUTPUT_STORAGE_KEY,
            String(toolSettings.audio_generation)
        )
    }, [showComposerContract, toolSettings.audio_generation])

    useEffect(() => {
        if (requireClearFiles) {
            files.forEach((file) => {
                if (file.preview && !file.googleDriveId)
                    URL.revokeObjectURL(file.preview)
            })
            setFiles([])

            // Reset the flag
            dispatch(setRequireClearFiles(false))
        }
    }, [requireClearFiles, dispatch, files])

    // Clean up object URLs when component unmounts
    useEffect(() => {
        return () => {
            files.forEach((file) => {
                if (file.preview && !file.googleDriveId)
                    URL.revokeObjectURL(file.preview)
            })
        }
    }, [files])

    // Add effect to sync textarea with external value changes
    useEffect(() => {
        if (textareaRef.current && textareaRef.current.value !== value) {
            textareaRef.current.value = value
            setCurrentTextareaValue(value)
        }
    }, [value])

    // Handle auto-focus when shouldFocusInput is triggered
    useEffect(() => {
        if (shouldFocusInput && textareaRef.current) {
            // Small delay to ensure DOM is ready after navigation
            setTimeout(() => {
                if (textareaRef.current?.value) {
                    textareaRef.current.value = ''
                    setCurrentTextareaValue('')
                }
                textareaRef.current?.focus()
                // Reset the focus trigger
                dispatch(setShouldFocusInput(false))
            }, 100)
        }
    }, [shouldFocusInput, dispatch])

    useEffect(() => {
        if (!googleDriveFiles || googleDriveFiles.length === 0) return

        const existingDriveIds = new Set(
            files
                .map((file) => file.googleDriveId)
                .filter((id): id is string => typeof id === 'string')
        )

        const newFiles = googleDriveFiles.filter(
            (file) => !existingDriveIds.has(file.id)
        )

        if (newFiles.length === 0) {
            onGoogleDriveFilesHandled?.()
            return
        }

        const newStatuses: FileUploadStatus[] = newFiles.map((file) => {
            const isImage = isImageFile(file.name)
            const isFolder = file.is_folder ?? false
            return {
                name: file.name,
                loading: false,
                isImage,
                preview: isImage && file.file_url ? file.file_url : undefined,
                googleDriveId: file.id,
                isFolder,
                fileCount: file.file_count
            }
        })

        setFiles((prev) => [...prev, ...newStatuses])

        dispatch(
            addUploadedFiles(
                newFiles.map((file) => {
                    if (file.is_folder && file.file_ids) {
                        return {
                            id: file.id,
                            name: `${file.name} (${file.file_count} files)`,
                            path: '',
                            size: file.size,
                            folderName: file.name,
                            fileCount: file.file_count
                        }
                    }
                    return {
                        id: file.id,
                        name: file.name,
                        path: file.file_url ?? '',
                        size: file.size
                    }
                })
            )
        )
        dispatch(
            addToCurrentMessageFileIds(
                newFiles.flatMap((file) => {
                    if (file.is_folder && file.file_ids) {
                        return file.file_ids.map(String)
                    }
                    return [file.id]
                })
            )
        )

        onGoogleDriveFilesHandled?.()
    }, [dispatch, files, googleDriveFiles, onGoogleDriveFilesHandled])

    return (
        <div
            className={`relative overflow-hidden rounded-[16px] border border-[var(--border-default)] bg-white shadow-[0_8px_24px_rgba(75,70,61,0.07)] ${className}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <FilesPreview
                files={files}
                isUploading={isUploading}
                onRemove={removeFile}
            />

            {/* Drag and Drop Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--border-brand)] bg-[rgba(244,243,239,0.95)] pointer-events-none backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <Icon
                            name="link"
                            className="size-10 fill-[var(--text-secondary)] animate-pulse"
                        />
                        <p className="text-lg font-medium text-[var(--text-primary)]">
                            Drop files here to upload
                        </p>
                    </div>
                </div>
            )}

            {/* Slide Template Selector - Modal overlay */}
            <SlideTemplateSelector
                isVisible={showTemplateSelector}
                onTemplateSelect={handleTemplateSelect}
                onClose={handleTemplateSelectorClose}
            />

            <div className="relative bg-transparent">
                <Textarea
                    ref={textareaRef}
                    className={`w-full resize-none overflow-y-auto rounded-[16px] border-0 bg-transparent p-4 text-[var(--text-primary)] shadow-none outline-none !placeholder-[color:var(--text-tertiary)] focus-visible:ring-0 focus-visible:ring-offset-0 md:p-5 ${
                        showComposerContract
                            ? '!pb-[132px] md:!pb-[138px]'
                            : '!pb-[88px]'
                    } ${
                        files.length > 0
                            ? '!pt-[84px] !min-h-[220px] md:!min-h-[240px]'
                            : 'min-h-[152px] md:min-h-[176px]'
                    } max-h-[400px] ${
                        questionMode === QUESTION_MODE.CHAT && files.length > 0
                            ? '!min-h-[200px]'
                            : ''
                    } ${textareaClassName}`}
                    placeholder={
                        placeholder || 'Describe what you want to accomplish...'
                    }
                    defaultValue={value}
                    onChange={(e) => {
                        const newValue = e.target.value
                        setCurrentTextareaValue(newValue)
                        setValue?.(newValue)
                    }}
                    onKeyDown={handleKeyDownWithAutoScroll}
                    onPaste={handlePaste}
                />
            </div>
            <div className="absolute bottom-0 left-0 w-full px-4 md:px-5">
                {!hideSuggestions && questionMode === QUESTION_MODE.AGENT && (
                    <Suggestions
                        hidden={!!currentTextareaValue.trim()}
                        agentType={selectedFeature}
                        onSelect={(item) => {
                            if (textareaRef.current) {
                                textareaRef.current.value = item
                                setCurrentTextareaValue(item)
                                setTimeout(() => {
                                    textareaRef.current?.focus()
                                }, 300)
                            }
                        }}
                    />
                )}
                <div className="border-t border-[var(--border-default)] bg-[#faf9f6]/95 py-4 backdrop-blur-sm">
                    {showComposerContract && (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                                    {bezelLabel}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                                    Bottom Composer Bezel
                                </p>
                            </div>
                            <div className="rounded-full border border-[var(--border-default)] bg-white px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                                {files.length > 0
                                    ? `${files.length} source${files.length === 1 ? '' : 's'} attached`
                                    : 'No attached sources'}
                            </div>
                        </div>
                    )}
                    <div className="flex items-end justify-between gap-3">
                    <div className="flex items-center flex-wrap gap-2 md:gap-3 min-w-0">
                        {showComposerContract && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`h-9 rounded-full border-[var(--border-default)] bg-white px-3 text-[var(--text-primary)] ${
                                    isListening
                                        ? 'border-[var(--border-brand-strong)] bg-[#f3f1ed]'
                                        : ''
                                }`}
                                onClick={toggleVoiceCapture}
                                disabled={
                                    isDisabled ||
                                    isCreatingSession ||
                                    !isVoiceCaptureSupported
                                }
                                title={
                                    isListening
                                        ? 'Stop voice capture'
                                        : 'Start voice capture'
                                }
                            >
                                {isListening ? 'Stop Mic' : 'Mic'}
                            </Button>
                        )}

                        <QuestionFileUpload
                            onFileChange={handleFileChange}
                            onGoogleDriveClick={onGoogleDriveClick}
                            isGoogleDriveConnected={isGoogleDriveConnected}
                            isGoogleDriveAuthLoading={isGoogleDriveAuthLoading}
                            isDisabled={
                                isUploading || (sessionId ? isLoading : false)
                            }
                        />

                        {showComposerContract && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-full border-[var(--border-default)] bg-white px-3 text-[var(--text-primary)]"
                                onClick={onOpenSetting}
                            >
                                Model
                                <span className="max-w-[132px] truncate text-[var(--text-secondary)]">
                                    {selectedModelName}
                                </span>
                                <Icon
                                    name="arrow-down"
                                    className="fill-current"
                                />
                            </Button>
                        )}

                        {showComposerContract && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 rounded-full border-[var(--border-default)] bg-white px-3 text-[var(--text-primary)]"
                                    >
                                        Data Sources
                                        <span className="text-[var(--text-secondary)]">
                                            {contextPackCount > 0
                                                ? `${contextPackCount}`
                                                : isGoogleDriveConnected
                                                  ? 'Ready'
                                                  : 'Add'}
                                        </span>
                                        <Icon
                                            name="arrow-down"
                                            className="fill-current"
                                        />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    className="w-64 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-raised)] p-2 text-[var(--text-primary)] shadow-[0_10px_24px_rgba(75,70,61,0.08)]"
                                >
                                    <DropdownMenuItem
                                        disabled
                                        className="rounded-xl px-3 py-3 text-[var(--text-secondary)] opacity-100"
                                    >
                                        {dataSourceSummary
                                            ? dataSourceSummary
                                            : contextPackCount > 0
                                              ? `${contextPackCount} context pack${contextPackCount === 1 ? '' : 's'} selected`
                                              : files.length > 0
                                                ? `${files.length} file source${files.length === 1 ? '' : 's'} attached to this turn`
                                            : 'No file sources attached yet'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={onGoogleDriveClick}
                                        disabled={
                                            !onGoogleDriveClick ||
                                            isGoogleDriveAuthLoading
                                        }
                                        className="cursor-pointer rounded-xl px-3 py-3"
                                    >
                                        {isGoogleDriveConnected
                                            ? 'Open Google Drive'
                                            : 'Connect Google Drive'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {showComposerContract && (
                            <label className="flex h-9 items-center gap-2 rounded-full border border-[var(--border-default)] bg-white px-3 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)] normal-case tracking-normal text-sm">
                                    Speech
                                </span>
                                <Switch
                                    checked={toolSettings.audio_generation}
                                    onCheckedChange={handleSpeechOutputChange}
                                    aria-label="Toggle speech output"
                                />
                            </label>
                        )}

                        {handleEnhancePrompt && (
                            <EnhanceButton
                                isGenerating={isGeneratingPrompt}
                                onClick={() => {
                                    if (handleEnhancePrompt)
                                        handleEnhancePrompt({
                                            prompt: currentTextareaValue,
                                            useTerminologyEngine:
                                                terminologyEngineEnabled,
                                            onSuccess: (res) => {
                                                if (textareaRef.current) {
                                                    textareaRef.current.value =
                                                        res
                                                    setCurrentTextareaValue(res)
                                                    setValue?.(res)
                                                }
                                            }
                                        })
                                }}
                                disabled={
                                    isGeneratingPrompt ||
                                    !currentTextareaValue.trim() ||
                                    isDisabled ||
                                    isLoading ||
                                    isUploading
                                }
                            />
                        )}

                        {handleEnhancePrompt && onTerminologyEngineChange && (
                            <label className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]">
                                    Terms
                                </span>
                                <Switch
                                    checked={terminologyEngineEnabled}
                                    onCheckedChange={onTerminologyEngineChange}
                                    aria-label="Toggle technical terminology engine"
                                />
                            </label>
                        )}

                        <ModeSelector
                            hide={hideModeSelector}
                            selectedMode={questionMode}
                            onSelect={handleSelectMode}
                        />

                        <FeatureSelector
                            hide={hideFeatureSelector}
                            selectedFeature={selectedFeature}
                            selectedTemplateName={
                                selectedSlideTemplate?.slide_template_name
                            }
                            onRemove={removeFeature}
                            onSelect={handleSelectFeature}
                        />

                        {onOpenSetting && (
                            <Button
                                variant="secondary"
                                size="icon"
                                className={`type-btn-sm h-9 w-auto rounded-full border border-[var(--border-default)] bg-white px-3 text-[var(--text-primary)] cursor-pointer ${showComposerContract ? 'hidden' : ''}`}
                                onClick={onOpenSetting}
                            >
                                {selectedModelName}
                                <Icon
                                    name="arrow-down"
                                    className="fill-current"
                                />
                            </Button>
                        )}
                    </div>
                    <SubmitButton
                        isLoading={isLoading}
                        isCreatingSession={isCreatingSession}
                        disabled={
                            !currentTextareaValue.trim() ||
                            isDisabled ||
                            isCreatingSession ||
                            files?.some((file) => file.loading) ||
                            isUploading
                        }
                        onCancel={handleCancel}
                        onSubmit={() => {
                            const currentValue =
                                textareaRef.current?.value || ''
                            if (currentValue.trim()) {
                                handleSubmit(currentValue)
                                if (textareaRef.current) {
                                    textareaRef.current.value = ''
                                    setCurrentTextareaValue('')
                                    setValue?.('')
                                }
                            }
                        }}
                    />
                    </div>
                </div>
            </div>

            {!hideFeatureSelector &&
                selectedFeature === AGENT_TYPE.GENERAL &&
                questionMode === QUESTION_MODE.AGENT && (
                    <div className="flex items-center justify-center absolute w-full -bottom-20 md:-bottom-14 z-10">
                        <div className="flex items-center gap-3 md:gap-4 md:justify-center flex-wrap md:flex-nowrap">
                            {FEATURES.map((feature) => (
                                <Button
                                    variant="outline"
                                    key={feature.name}
                                    onClick={() =>
                                        handleSelectFeature(feature.type)
                                    }
                                    className="h-7 md:h-8 !px-4 cursor-pointer rounded-full text-xs border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[#f3f1ed] transition-colors"
                                >
                                    <Icon
                                        name={feature.icon}
                                        className="hidden md:block size-4 fill-[var(--text-primary)]"
                                    />
                                    {feature.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
        </div>
    )
}

export default QuestionInput
