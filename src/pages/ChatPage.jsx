import { useState, useRef, useEffect, useCallback } from 'react'
import { getSettings } from '../stores/settings.js'
import { db } from '../stores/db.js'
import { streamChat } from '../lib/api-router.js'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function loadConversations() {
    const convs = await db.conversations.orderBy('updatedAt').reverse().toArray()
    setConversations(convs)
  }

  async function selectConversation(conv) {
    setActiveConv(conv)
    const msgs = await db.messages.where('conversationId').equals(conv.id).sortBy('createdAt')
    setMessages(msgs)
    setError(null)
  }

  async function newChat() {
    setActiveConv(null)
    setMessages([])
    setStreamingText('')
    setError(null)
    inputRef.current?.focus()
  }

  function handleStop() {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return

    const settings = getSettings()
    if (!settings.activeProvider || !settings.activeModel) {
      setError('Please configure an AI provider in Settings first.')
      return
    }

    const provider = settings.providers.find(p => p.id === settings.activeProvider)
    if (!provider) {
      setError('Active provider not found. Please reconfigure in Settings.')
      return
    }

    const userText = input.trim()
    const userMsg = { role: 'user', content: userText, createdAt: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)
    setStreamingText('')

    // Create or get conversation
    let convId = activeConv?.id
    if (!convId) {
      convId = await db.conversations.add({
        title: userText.slice(0, 50) + (userText.length > 50 ? '...' : ''),
        model: settings.activeModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      const conv = await db.conversations.get(convId)
      setActiveConv(conv)
      loadConversations()
    }

    await db.messages.add({ ...userMsg, conversationId: convId })

    // Build messages array for API
    const history = await db.messages.where('conversationId').equals(convId).sortBy('createdAt')
    const apiMessages = []

    // Inject memories as system context
    const memories = await db.memories.toArray()
    let systemPrompt = 'You are a helpful AI assistant.'
    if (memories.length > 0) {
      const memoryLines = memories.map(m => `- ${m.title}: ${m.content}`).join('\n')
      systemPrompt += `\n\nUser's saved notes:\n${memoryLines}`
    }
    apiMessages.push({ role: 'system', content: systemPrompt })

    for (const msg of history) {
      apiMessages.push({ role: msg.role, content: msg.content })
    }

    // Stream response
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const fullText = await streamChat({
        provider,
        model: settings.activeModel,
        messages: apiMessages,
        options: { temperature: 0.7 },
        onToken: (token) => {
          setStreamingText(prev => prev + token)
        },
        signal: abort.signal,
      })

      // Save assistant message
      const assistantMsg = { role: 'assistant', content: fullText, createdAt: Date.now(), conversationId: convId }
      await db.messages.add(assistantMsg)
      await db.conversations.update(convId, { updatedAt: Date.now() })

      setMessages(prev => [...prev, { role: 'assistant', content: fullText, createdAt: Date.now() }])
      setStreamingText('')
      loadConversations()
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        // Save partial response if any
        const partial = streamingText
        if (partial) {
          const assistantMsg = { role: 'assistant', content: partial + '\n\n[Response interrupted]', createdAt: Date.now(), conversationId: convId }
          await db.messages.add(assistantMsg)
          setMessages(prev => [...prev, assistantMsg])
        }
      } else if (streamingText) {
        // Aborted by user — save partial
        const assistantMsg = { role: 'assistant', content: streamingText, createdAt: Date.now(), conversationId: convId }
        await db.messages.add(assistantMsg)
        setMessages(prev => [...prev, assistantMsg])
      }
      setStreamingText('')
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  async function handleDeleteConversation(e, convId) {
    e.stopPropagation()
    await db.messages.where('conversationId').equals(convId).delete()
    await db.conversations.delete(convId)
    if (activeConv?.id === convId) {
      setActiveConv(null)
      setMessages([])
    }
    loadConversations()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const settings = getSettings()
  const hasProvider = settings.activeProvider && settings.activeModel

  return (
    <div className="flex h-full">
      {/* Conversation list sidebar */}
      <div className="w-64 flex flex-col border-r"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <div className="p-3">
          <button onClick={newChat}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.map(conv => (
            <div key={conv.id}
              onClick={() => selectConversation(conv)}
              className="group w-full text-left px-3 py-2 rounded-lg mb-1 text-sm truncate transition-colors cursor-pointer flex items-center justify-between"
              style={{
                background: activeConv?.id === conv.id ? 'var(--bg-glass-hover)' : 'transparent',
                color: activeConv?.id === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeConv?.id === conv.id ? '1px solid var(--border-accent)' : '1px solid transparent',
              }}>
              <span className="truncate">{conv.title}</span>
              <button
                onClick={(e) => handleDeleteConversation(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 text-xs px-1 rounded cursor-pointer flex-shrink-0"
                style={{ color: 'var(--danger)' }}>
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center px-6 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {activeConv ? activeConv.title : 'New Chat'}
          </span>
          {settings.activeModel && (
            <span className="ml-3 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-hover)' }}>
              {settings.activeModel}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !streamingText && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                E
              </div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Easy AI
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {hasProvider
                  ? 'Start a conversation with your AI assistant.'
                  : 'Configure an AI provider in Settings to get started.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-glass)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streamingText && (
            <div className="mb-4 flex justify-start">
              <div className="max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                {streamingText}
                <span className="animate-pulse ml-0.5">▊</span>
              </div>
            </div>
          )}

          {/* Loading indicator (before streaming starts) */}
          {loading && !streamingText && (
            <div className="mb-4 flex justify-start">
              <div className="px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-4 flex justify-start">
              <div className="max-w-[70%] px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-6 pb-4 pt-2">
          <div className="flex gap-3 items-end p-3 rounded-2xl"
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasProvider ? 'Type a message...' : 'Configure a provider in Settings first'}
              disabled={!hasProvider || loading}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-sm resize-none"
              style={{ color: 'var(--text-primary)', maxHeight: '120px' }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            {loading ? (
              <button onClick={handleStop}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                style={{ background: 'var(--danger)', color: '#fff' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button onClick={handleSend}
                disabled={!input.trim() || !hasProvider}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                style={{
                  background: input.trim() && hasProvider ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: input.trim() && hasProvider ? '#fff' : 'var(--text-muted)',
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
