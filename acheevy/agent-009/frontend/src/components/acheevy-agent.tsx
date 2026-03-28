   'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from './ui/button'
import HandoffTransitionPlayer from './acheevy/handoff-transition-player'
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton
} from './ai-elements/conversation'
import { Message, MessageContent } from './ai-elements/message'
import QuestionFileUpload from './question-file-upload'
import { useUploadFiles, type FileUploadStatus } from '../hooks/use-upload-files'
import { AudioVisualizer } from './audio-visualizer'
import { AudioPlayer } from './audio-player'
import { getApiBaseUrl } from '@/lib/api-base-url'

interface Message {
	role: 'user' | 'assistant' | 'system'
	content: string
	timestamp: number
	intent?: 'conversation' | 'execution'
	handoff?: {
		backend?: string
		task?: string
		status?: string
		task_id?: string
	}
	engine?: string
	technicalTranslation?: string
	clarificationQuestion?: string
}

interface Model {
	id: string
	name: string
}

const AVAILABLE_MODELS: Model[] = [
	{ id: 'inception/mercury-2', name: 'Mercury 2' },
	{ id: 'openai/gpt-5.4', name: 'GPT-5.4' },
	{ id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
	{ id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
	{ id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2' },
	{ id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
	{ id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' }
]

const API_BASE_URL = getApiBaseUrl()

export function AcheevyAgent() {
	const [messages, setMessages] = useState<Message[]>([])
	const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id)
	const [inputValue, setInputValue] = useState('')
	const [isWorking, setIsWorking] = useState(false)
	const [voiceEnabled, setVoiceEnabled] = useState(true)
	const [voiceFirstMode, setVoiceFirstMode] = useState(true)
	const [isRecording, setIsRecording] = useState(false)
	const [isSpeaking, setIsSpeaking] = useState(false)
	const [recordingError, setRecordingError] = useState<string>('')
	const [reasoningSteps, setReasoningSteps] = useState<string[]>([])
	const [handoffTransition, setHandoffTransition] = useState<{
		visible: boolean
		backend: string
		task: string
		status: string
	}>({
		visible: false,
		backend: '',
		task: '',
		status: ''
	})
	const [conversationId, setConversationId] = useState<string>(`conv-${Date.now()}`)
	const [uploadedFiles, setUploadedFiles] = useState<FileUploadStatus[]>([])

	// File upload hook
	const { handleFileUploadWithSignedUrl } = useUploadFiles()

	// Audio player state
	const [isAudioPlaying, setIsAudioPlaying] = useState(false)

	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const audioRef = useRef<HTMLAudioElement>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const mediaStreamRef = useRef<MediaStream | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const activeRequestRef = useRef<AbortController | null>(null)
	const handoffTimeoutRef = useRef<number | null>(null)

	const statusText = useMemo(() => {
		if (isRecording) return 'LISTENING'
		if (isSpeaking) return 'SPEAKING'
		if (isWorking) return 'WORKING'
		return 'READY'
	}, [isRecording, isSpeaking, isWorking])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	useEffect(() => {
		return () => {
			if (handoffTimeoutRef.current) {
				window.clearTimeout(handoffTimeoutRef.current)
			}
			if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
				mediaRecorderRef.current.stop()
			}
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach(track => track.stop())
			}
		}
	}, [])

	const addSystemMessage = (content: string) => {
		setMessages(prev => [...prev, { role: 'system', content, timestamp: Date.now() }])
	}

	const speakAssistantResponse = async (text: string) => {
		if (!voiceEnabled || !text.trim()) return

		try {
			const response = await fetch(`${API_BASE_URL}/api/voice/tts`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ text })
			})

			if (!response.ok) {
				return
			}

			const audioBlob = await response.blob()
			const audioUrl = URL.createObjectURL(audioBlob)
			if (audioRef.current) {
				setIsSpeaking(true)
				audioRef.current.src = audioUrl
				await audioRef.current.play()
			}
			setTimeout(() => URL.revokeObjectURL(audioUrl), 20000)
		} catch {
			// Keep voice failures silent to avoid noisy UX.
		} finally {
			setIsSpeaking(false)
		}
	}

	const handleFileChange = async (filesToUpload: File[]) => {
		await handleFileUploadWithSignedUrl(filesToUpload, setUploadedFiles)
	}

	const sendMessage = async (rawMessage: string) => {
		const message = rawMessage.trim()
		if (!message || isWorking) return

		const userMessage: Message = {
			role: 'user',
			content: message,
			timestamp: Date.now()
		}
		setMessages(prev => [...prev, userMessage])
		setInputValue('')
		setIsWorking(true)
		setReasoningSteps([
			'Understanding your request',
			'Processing context',
			'Evaluating approach'
		])

		try {
			const controller = new AbortController()
			activeRequestRef.current = controller

			const history = messages
				.filter(m => m.role === 'user' || m.role === 'assistant')
				.map(m => ({ role: m.role, content: m.content }))

			const response = await fetch(`${API_BASE_URL}/api/chat/route`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				signal: controller.signal,
				body: JSON.stringify({
					message,
					model: selectedModel,
					conversation_history: history,
					conversationId
				})
			})

			if (!response.ok) {
				throw new Error('Could not complete request')
			}

			const data = await response.json()
			const assistantText = typeof data.response === 'string' ? data.response : 'I am on it.'

			const handoffDetails =
				data.handoff && typeof data.handoff === 'object'
					? {
						backend: typeof data.handoff.backend === 'string' ? data.handoff.backend : undefined,
						task: typeof data.handoff.task === 'string' ? data.handoff.task : undefined,
						status: typeof data.handoff.status === 'string' ? data.handoff.status : undefined,
						task_id: typeof data.handoff.task_id === 'string' ? data.handoff.task_id : undefined
					}
					: undefined

			const nextReasoning = [
				'Understanding your request',
				'Processing context',
				'Evaluating approach'
			]

			if (data.clarification_required) {
				nextReasoning.push('Asking clarifying questions')
			} else if (data.intent === 'execution') {
				nextReasoning.push('Preparing to execute')
				nextReasoning.push(
					handoffDetails?.status
						? `Status: ${handoffDetails.status}`
						: 'Status: processing'
				)
			} else {
				nextReasoning.push('Providing response')
			}

			setReasoningSteps(nextReasoning)

			setMessages(prev => [
				...prev,
				{
					role: 'assistant',
					content: assistantText,
					timestamp: Date.now(),
					intent:
						data.intent === 'execution' || data.intent === 'conversation'
							? data.intent
							: undefined,
					handoff: handoffDetails,
					engine: typeof data.engine === 'string' ? data.engine : undefined,
					technicalTranslation:
						typeof data.technical_translation === 'string'
							? data.technical_translation
							: undefined,
					clarificationQuestion:
						typeof data.clarification_question === 'string'
							? data.clarification_question
							: undefined
				}
			])

			if (typeof data.conversationId === 'string' && data.conversationId) {
				setConversationId(data.conversationId)
			}

			if (data.clarification_required) {
				setIsWorking(false)
				inputRef.current?.focus()
				return
			}

			if (data.intent === 'execution') {
				const backend = handoffDetails?.backend || 'ii-agent'
				const task = handoffDetails?.task || message
				const status = handoffDetails?.status || 'processing'
				setHandoffTransition({ visible: true, backend, task, status })
				if (handoffTimeoutRef.current) {
					window.clearTimeout(handoffTimeoutRef.current)
				}
				handoffTimeoutRef.current = window.setTimeout(() => {
					setHandoffTransition(prev => ({ ...prev, visible: false }))
				}, 5200)
			}

			await speakAssistantResponse(assistantText)
		} catch {
			if (activeRequestRef.current?.signal.aborted) {
				addSystemMessage('Stopped. Ready for your next instruction.')
			} else {
				addSystemMessage('I could not complete that request right now. Please try again.')
			}
		} finally {
			activeRequestRef.current = null
			setIsWorking(false)
			inputRef.current?.focus()
		}
	}

	const interruptWork = async () => {
		try {
			if (activeRequestRef.current) {
				activeRequestRef.current.abort()
				activeRequestRef.current = null
			}

			if (isRecording && mediaRecorderRef.current?.state !== 'inactive') {
				mediaRecorderRef.current?.stop()
			}

			await fetch(`${API_BASE_URL}/api/chat/interrupt`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ conversationId })
			})
		} catch {
			// Ignore interrupt network errors and still reset UI state.
		} finally {
			setIsWorking(false)
			setReasoningSteps([])
			setIsRecording(false)
			setIsSpeaking(false)
			setRecordingError('')
			addSystemMessage('Stopped. Ready for your next instruction.')
		}
	}

	const stopRecordingAndTranscribe = async () => {
		if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

		const recorder = mediaRecorderRef.current
		recorder.stop()
		setIsRecording(false)

		await new Promise<void>((resolve) => {
			recorder.onstop = () => resolve()
		})

		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach(track => track.stop())
			mediaStreamRef.current = null
		}

		const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
		audioChunksRef.current = []
		if (audioBlob.size === 0) {
			setRecordingError('No audio captured. Try again.')
			return
		}

		setIsWorking(true)
		try {
			const form = new FormData()
			form.append('audio', audioBlob, 'voice.webm')

			const response = await fetch(`${API_BASE_URL}/api/voice/stt`, {
				method: 'POST',
				body: form
			})

			if (!response.ok) {
				throw new Error('Voice transcription failed')
			}

			const data = await response.json()
			const transcript = (data.text || '').trim()
			if (!transcript) {
				setRecordingError('I did not catch that. Please try again.')
				return
			}

			setRecordingError('')
			await sendMessage(transcript)
		} catch {
			setRecordingError('Voice input is unavailable right now.')
			setIsWorking(false)
		}
	}

	const startRecording = async () => {
		if (isRecording || isWorking) return

		try {
			// Optional preflight: request short-lived speech token from backend.
			await fetch(`${API_BASE_URL}/api/voice/scribe-token`, {
				method: 'POST'
			}).catch(() => null)

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			mediaStreamRef.current = stream
			const recorder = new MediaRecorder(stream)
			mediaRecorderRef.current = recorder
			audioChunksRef.current = []

			recorder.ondataavailable = (event: BlobEvent) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data)
				}
			}

			recorder.start()
			setIsRecording(true)
			setRecordingError('')
		} catch {
			setRecordingError('Microphone permission is required for voice input.')
		}
	}

	const toggleRecording = async () => {
		if (isRecording) {
			await stopRecordingAndTranscribe()
		} else {
			await startRecording()
		}
	}

	const clearConversation = () => {
		setMessages([])
		setConversationId(`conv-${Date.now()}`)
		setReasoningSteps([])
		setRecordingError('')
		setInputValue('')
	}

	const replayLastAssistantMessage = async () => {
		const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
		if (!lastAssistant) return
		await speakAssistantResponse(lastAssistant.content)
	}

	return (
		<div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(212,136,31,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_28%)]" />
			<audio ref={audioRef} className="hidden" />

			{handoffTransition.visible && (
				<div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
				<div className="w-full max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-5xl px-4 sm:px-0">
						<div className="mb-3 flex items-center justify-between">
							<div>
								<div className="type-label-sm text-amber-300">Execution Handoff</div>
								<div className="type-body-sm text-neutral-300">
									ACHEEVY {'->'} {handoffTransition.backend} ({handoffTransition.status})
								</div>
							</div>
							<button
								onClick={() => setHandoffTransition(prev => ({ ...prev, visible: false }))}
								className="px-3 py-1.5 text-xs rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400"
								title="Skip handoff transition animation"
								aria-label="Skip handoff transition"
							>
								Skip
							</button>
						</div>
						<div className="h-[380px] border border-neutral-700 rounded-xl overflow-hidden">
							<HandoffTransitionPlayer
								backend={handoffTransition.backend}
								task={handoffTransition.task}
							/>
						</div>
					</div>
				</div>
			)}

			<div className="relative z-10 border-b border-[var(--border-default)] bg-[rgba(10,10,10,0.84)] backdrop-blur-xl">
				<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-2xl border border-[var(--border-brand)] bg-[var(--bg-brand-subtle)] shadow-[var(--shadow-glow-gold)]">
							<div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
						</div>
						<div className="flex flex-col">
							<span className="type-h3 tracking-tight text-[var(--text-primary)]">ACHEEVY</span>
							<span className="type-label-sm text-[var(--text-secondary)]">{statusText}</span>
						</div>
						{(isRecording || isSpeaking) && (
							<div className="flex items-end gap-1 ml-1">
								<span className="w-1 h-2 bg-amber-400 rounded animate-pulse" />
								<span className="w-1 h-3 bg-amber-400 rounded animate-pulse [animation-delay:120ms]" />
								<span className="w-1 h-4 bg-amber-400 rounded animate-pulse [animation-delay:240ms]" />
							</div>
						)}
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setVoiceEnabled(v => !v)}
							className={`type-btn-sm rounded-xl border px-4 py-2.5 transition ${
								voiceEnabled
									? 'border-[var(--border-brand-strong)] bg-[var(--bg-brand-subtle)] text-[var(--text-brand)]'
									: 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)]'
							}`}
							title={voiceEnabled ? 'Disable voice input/output' : 'Enable voice input/output'}
							aria-label={voiceEnabled ? 'Voice input/output enabled' : 'Voice input/output disabled'}
						>
							{voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}
						</button>
						<select
							value={selectedModel}
							onChange={(e) => setSelectedModel(e.target.value)}
							disabled={isWorking || isRecording}
							aria-label="Select AI model"
							className="type-btn-sm min-w-52 rounded-xl border border-[var(--border-default)] bg-[var(--bg-raised)] px-4 py-2.5 text-[var(--text-primary)] disabled:opacity-50"
						>
							{AVAILABLE_MODELS.map(model => (
								<option key={model.id} value={model.id}>
									{model.name}
								</option>
							))}
						</select>
						<button
							onClick={() => void replayLastAssistantMessage()}
							disabled={isWorking || isRecording || !messages.some(m => m.role === 'assistant')}
							className="type-btn-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-raised)] px-4 py-2.5 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
							title="Replay the last message from the assistant"
							aria-label="Replay last message"
						>
							REPLAY
						</button>
						<button
							onClick={clearConversation}
							disabled={isWorking || isRecording}
							className="type-btn-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-raised)] px-4 py-2.5 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
							title="Clear all messages and start new conversation"
							aria-label="Clear conversation"
						>
							CLEAR
						</button>
						<button
							onClick={() => void interruptWork()}
							disabled={!isWorking && !isRecording && !isSpeaking}
							className="type-btn-sm rounded-xl border border-red-500/40 bg-red-500/8 px-4 py-2.5 text-red-300 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
							title="Stop current execution, recording, or audio output"
							aria-label="Stop execution"
						>
							STOP
						</button>
					</div>
				</div>
			</div>

			<Conversation className="relative z-10 bg-transparent">
				<ConversationContent className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
					{(isWorking || reasoningSteps.length > 0) && (
					<div className="sticky top-0 z-20 mb-6 -mx-6 -mt-5 px-6 pt-5 pb-4 bg-black/95 backdrop-blur-sm border-b border-cyan-600/20">
						<div className="rounded-lg border border-cyan-600/40 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 p-4 shadow-lg shadow-cyan-900/20">
							<div className="flex items-center gap-2 mb-3">
								<div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
								<div className="type-label-md text-cyan-300">Thinking</div>
							</div>
							<div className="space-y-2">
								{reasoningSteps.map((step, idx) => {
									// Filter out internal implementation details from display
									if (step.includes('ii-agent') || step.includes('NTNTN') || step.includes('SME_ANG')) {
										return null
									}
									return (
										<div key={`${step}-${idx}`} className="flex items-start gap-2 text-xs text-cyan-100">
											<span className="w-1 h-1 rounded-full bg-cyan-300 mt-1.5 flex-shrink-0" />
											<span className="leading-relaxed">{step}</span>
										</div>
									)
								})}
							</div>
						</div>
					</div>
				)}

			{messages.length === 0 ? (
				<ConversationEmptyState
				title="Voice-first ACHEEVY"
				description="Speak or type your request. ACHEEVY handles the work and returns outcomes."
				icon={
					<div className="flex size-24 items-center justify-center rounded-[28px] border border-[var(--border-brand)] bg-[linear-gradient(180deg,rgba(255,171,0,0.98),rgba(255,98,0,0.98))] shadow-[0_24px_80px_rgba(212,136,31,0.28)]">
						<span className="text-4xl font-bold text-white">A</span>
					</div>
				}
				className="mx-auto mt-8 max-w-3xl rounded-[32px] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-8 py-14 text-[var(--text-secondary)] shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
			/>
		) : (
			messages.map((msg, i) => {
				const from = msg.role === 'user' ? 'user' : 'assistant'
				const isSystem = msg.role === 'system'
				return (
					<Message key={i} from={from}>
						<MessageContent
							variant="contained"
							className={
								isSystem
									? 'border border-red-500/30 bg-red-500/10 text-red-100'
									: from === 'user'
									? 'border border-[rgba(255,170,0,0.25)] bg-[linear-gradient(135deg,rgba(255,170,0,0.22),rgba(212,136,31,0.34))] text-white shadow-[0_18px_48px_rgba(212,136,31,0.14)]'
									: 'border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] text-[var(--text-primary)]'
							}
						>
										<div className="type-body-xs mb-1 opacity-70">
											{new Date(msg.timestamp).toLocaleTimeString()}
										</div>
										<div className="type-body whitespace-pre-wrap break-words">{msg.content}</div>
										{msg.clarificationQuestion && (
											<div className="mt-4 rounded-2xl border border-[var(--border-brand)] bg-[var(--bg-brand-subtle)] px-4 py-3">
												<div className="type-label-sm mb-2 text-[var(--text-brand)]">Need clarification</div>
												<div className="type-body-sm leading-relaxed text-[var(--text-primary)]">{msg.clarificationQuestion}</div>
											</div>
										)}
									</MessageContent>
								</Message>
							)
						})
					)}

					{(isWorking || isRecording || isSpeaking) && (
						<Message from="assistant">
							<MessageContent variant="contained" className="border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]">
								{isRecording ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Working...'}
							</MessageContent>
						</Message>
					)}

					<div ref={messagesEndRef} />
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			{/* Audio Player - Show when speaking */}
			{isSpeaking && (
				<div className="relative z-10 border-t border-[var(--border-default)] bg-[rgba(10,10,10,0.84)] px-6 py-3 backdrop-blur-xl">
					<AudioPlayer 
						audioRef={audioRef as React.RefObject<HTMLAudioElement>}
						isPlaying={isAudioPlaying}
						onPlayingChange={setIsAudioPlaying}
					/>
				</div>
			)}

			<div className="relative z-10 border-t border-[var(--border-default)] bg-[rgba(10,10,10,0.86)] px-4 py-4 backdrop-blur-xl md:px-6">
				<div className="mx-auto w-full max-w-6xl rounded-[28px] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3 shadow-[0_22px_80px_rgba(0,0,0,0.4)] md:p-4">
				{recordingError && (
					<div className="type-body-xs mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
						{recordingError}
					</div>
				)}

				{/* Uploaded Files Display */}
				{uploadedFiles.length > 0 && (
					<div className="mb-3 flex flex-wrap gap-2">
						{uploadedFiles.map((file, idx) => (
							<div
								key={`${file.name}-${idx}`}
								className="flex items-center gap-2 rounded-2xl border border-[var(--border-brand)] bg-[var(--bg-brand-subtle)] px-3 py-2 text-[var(--text-primary)]"
							>
								<span className={file.loading ? 'opacity-60' : ''}>
									{file.name}
								</span>
								{file.loading && (
									<span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
								)}
								{file.error && (
									<span className="type-body-xs text-red-400">({file.error})</span>
								)}
							</div>
						))}
					</div>
				)}

				<div className="flex flex-wrap items-end gap-3 md:flex-nowrap">
					<button
						onClick={() => setVoiceFirstMode(v => !v)}
						disabled={isWorking || isRecording}
						title={voiceFirstMode ? 'Disable voice-first mode' : 'Enable voice-first mode'}
						aria-label={voiceFirstMode ? 'Voice-first mode enabled' : 'Voice-first mode disabled'}
						className={`type-btn-sm rounded-2xl border px-4 py-3 transition ${
							voiceFirstMode
								? 'border-[var(--border-brand)] bg-[var(--bg-brand-subtle)] text-[var(--text-brand)]'
								: 'border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-secondary)]'
						}`}
					>
						{voiceFirstMode ? 'VOICE-FIRST ON' : 'VOICE-FIRST OFF'}
					</button>

					<input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								void sendMessage(inputValue)
							}
						}}
						disabled={isWorking || isRecording}
						placeholder="Ask ACHEEVY..."
						className="type-body min-h-14 flex-1 rounded-[22px] border border-[var(--border-brand)] bg-[rgba(0,0,0,0.32)] px-5 py-4 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-brand-strong)] focus:bg-[rgba(0,0,0,0.52)] disabled:opacity-60"
					/>

					<QuestionFileUpload 
						onFileChange={handleFileChange}
						isDisabled={isWorking || isRecording}
					/>

					<Button
						onClick={() => void toggleRecording()}
						disabled={isWorking}
						title={isRecording ? 'Stop recording' : voiceFirstMode ? 'Start voice input' : 'Toggle microphone'}
						aria-label={isRecording ? 'Stop recording' : voiceFirstMode ? 'Voice input' : 'Microphone toggle'}
						className={`type-btn-sm rounded-2xl px-5 py-3 ${
							isRecording
								? 'bg-red-600 hover:bg-red-700 text-white'
								: voiceFirstMode
								? 'bg-[#0d88b8] hover:bg-[#0b95c7] text-white'
								: 'bg-[var(--bg-raised)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)]'
						}`}
					>
						{isRecording ? 'Stop' : voiceFirstMode ? 'Voice' : 'Mic'}
					</Button>

					{/* Audio Waveform Visualizer - Shows during recording */}
					<AudioVisualizer isActive={isRecording} mediaStream={mediaStreamRef.current || undefined} />

					<Button
						onClick={() => void sendMessage(inputValue)}
						disabled={isWorking || isRecording || !inputValue.trim()}
						title="Send message to ACHEEVY"
						aria-label="Send message"
						className="type-btn-sm rounded-2xl bg-[linear-gradient(135deg,#f0b327,#d66d16)] px-6 py-3 text-white shadow-[0_18px_48px_rgba(214,109,22,0.34)] hover:brightness-105"
					>
						Send
					</Button>
				</div>
				</div>
			</div>
		</div>
	)
}