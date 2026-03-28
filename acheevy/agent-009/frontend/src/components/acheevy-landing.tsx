'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from './ui/button'
import { Icon } from './ui/icon'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
  intent?: 'conversation' | 'execution'
  handoff?: Record<string, unknown>
}

interface Model {
  id: string
  name: string
  provider: string
}

const AVAILABLE_MODELS: Model[] = [
  { id: 'inception/mercury-2', name: 'Mercury 2', provider: 'openrouter' },
  { id: 'openai/gpt-5.4', name: 'GPT-5.4', provider: 'openrouter' },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'openrouter' },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'openrouter' },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'openrouter' },
  { id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'openrouter' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'openrouter' }
]

export function AcheevyLanding() {
  const { theme, setTheme } = useTheme()
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id)
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isTyping) return

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      const response = await fetch('http://localhost:8002/api/chat/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          conversation_history: messages,
          model: selectedModel
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
        intent: data.intent,
        handoff: data.handoff
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.intent === 'execution') {
        console.log('Execution task handed off:', {
          backend: data.handoff?.backend,
          task: data.handoff?.task,
          status: data.handoff?.status
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      inputRef.current?.focus()
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // ============ LANDING PAGE VIEW ============
  if (!showChat) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col">
        {/* Simple Header */}
        <header className="border-b border-neutral-200 dark:border-neutral-800 p-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono text-neutral-900 dark:text-white">
                ACHEEVY-009
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
            >
              <Icon
                name={theme === 'dark' ? 'sun' : 'moon'}
                className="w-5 h-5"
              />
            </Button>
          </div>
        </header>

        {/* Minimal Center Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="max-w-2xl w-full space-y-8 text-center">
            {/* Simple Logo */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">A</span>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="type-h1 text-neutral-900 dark:text-white">
                ACHEEVY-009
              </h1>
              <p className="type-body text-neutral-600 dark:text-neutral-400">
                Chat with AI. Get things done.
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <label className="type-label-md text-neutral-700 dark:text-neutral-300">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full max-w-md mx-auto px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono"
                aria-label="Select AI model"
              >
                {AVAILABLE_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Button */}
            <Button
              onClick={() => setShowChat(true)}
              size="lg"
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
            >
              Start Chat
            </Button>

            {/* Info */}
            <p className="type-body-xs text-neutral-500 dark:text-neutral-500 font-mono">
              Mercury 2 • March 2026
            </p>
          </div>
        </main>
      </div>
    )
  }

  // ============ CHAT VIEW ============
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Chat Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 p-4 flex justify-between items-center bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowChat(false)
              setMessages([])
            }}
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-3 py-2 rounded-lg transition"
          >
            ← Back
          </button>
          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-500">|</span>
          <span className="font-bold text-neutral-900 dark:text-white font-mono">ACHEEVY-009</span>
        </div>

        {/* Model Switcher */}
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isTyping || messages.length > 0}
          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-mono text-neutral-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-neutral-400 dark:hover:border-neutral-600 transition"
          aria-label="Select AI model"
        >
          {AVAILABLE_MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">A</span>
            </div>
            <div className="text-center text-neutral-600 dark:text-neutral-400">
              <p className="font-semibold">Start chatting with {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}</p>
              <p className="text-sm mt-1">
                Ask me anything or tell me what you need done.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-xs md:max-w-md lg:max-w-xl px-4 py-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-none break-words whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-xs md:max-w-md lg:max-w-xl space-y-2">
                  <div
                    className={`px-4 py-3 rounded-xl rounded-bl-none break-words whitespace-pre-wrap ${
                      msg.intent === 'execution'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.intent === 'execution' && msg.handoff && (
                    <div className="px-4 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        🔄 {String(msg.handoff.backend) === 'ii-agent' ? 'Handed off to ii-agent' : 'Processing in sandbox'}
                      </div>
                      {typeof msg.handoff.task === 'string' && msg.handoff.task.length > 0 && (
                        <div className="text-blue-800 dark:text-blue-200">
                          Task: {String(msg.handoff.task)}
                        </div>
                      )}
                      {typeof msg.handoff.status === 'string' && msg.handoff.status.length > 0 && (
                        <div className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                          Status: {String(msg.handoff.status)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-3 rounded-xl rounded-bl-none">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-neutral-600 dark:bg-neutral-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-neutral-600 dark:bg-neutral-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-neutral-600 dark:bg-neutral-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Message ACHEEVY..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isTyping) {
                handleSendMessage(inputValue)
              }
            }}
            disabled={isTyping}
            className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          />
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={isTyping || !inputValue.trim()}
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white h-12 px-6 rounded-xl"
          >
            <Icon name="send" className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 font-mono">
          Press Enter to send
        </p>
      </div>
    </div>
  )
}
