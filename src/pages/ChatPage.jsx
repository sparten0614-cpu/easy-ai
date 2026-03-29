import { useState, useRef, useEffect } from 'react'
import { getSettings } from '../stores/settings.js'
import { db } from '../stores/db.js'
import { streamChat, buildMultimodalContent, fileToBase64 } from '../lib/api-router.js'
import MessageBubble from '../components/MessageBubble.jsx'

const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [attachedImages, setAttachedImages] = useState([]) // {file, preview, base64, mimeType}
  const [searchQuery, setSearchQuery] = useState('')
  const [editingConvId, setEditingConvId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [retryInfo, setRetryInfo] = useState(null) // {countdown, message}
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const fileInputRef = useRef(null)
  const retryTimerRef = useRef(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current)
      attachedImages.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [])

  async function loadConversations() {
    const convs = await db.conversations.orderBy('updatedAt').reverse().toArray()
    setConversations(convs)
  }

  async function selectConversation(conv) {
    setActiveConv(conv)
    const msgs = await db.messages.where('conversationId').equals(conv.id).sortBy('createdAt')
    setMessages(msgs)
    setError(null)
    setRetryInfo(null)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  async function newChat() {
    setActiveConv(null)
    setMessages([])
    setStreamingText('')
    setError(null)
    setRetryInfo(null)
    setAttachedImages([])
    inputRef.current?.focus()
  }

  function handleStop() {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }

  // ─── File Upload ────────────────────────────────────────

  async function processFiles(files) {
    const newImages = []
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(`Unsupported file type: ${file.type}. Supported: PNG, JPEG, GIF, WebP`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 20MB`)
        continue
      }
      const base64 = await fileToBase64(file)
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        base64,
        mimeType: file.type,
      })
    }
    setAttachedImages(prev => [...prev, ...newImages])
  }

  function removeImage(index) {
    setAttachedImages(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) processFiles(files)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handlePaste(e) {
    const items = Array.from(e.clipboardData.items)
    const imageItems = items.filter(item => item.type.startsWith('image/'))
    if (imageItems.length) {
      e.preventDefault()
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean)
      processFiles(files)
    }
  }

  // ─── Conversation Management ────────────────────────────

  async function handleRenameConversation(convId, newTitle) {
    if (!newTitle.trim()) return
    await db.conversations.update(convId, { title: newTitle.trim() })
    if (activeConv?.id === convId) {
      setActiveConv(prev => ({ ...prev, title: newTitle.trim() }))
    }
    setEditingConvId(null)
    loadConversations()
  }

  async function handlePinConversation(e, convId) {
    e.stopPropagation()
    const conv = await db.conversations.get(convId)
    await db.conversations.update(convId, { pinned: !conv.pinned })
    loadConversations()
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

  // Filter and sort conversations
  const filteredConversations = conversations
    .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0 // already sorted by updatedAt from DB
    })

  // ─── Send Message ───────────────────────────────────────

  async function handleSend() {
    if ((!input.trim() && attachedImages.length === 0) || loading) return

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
    const images = [...attachedImages]

    // Build display content (text + image indicators)
    let displayContent = userText
    if (images.length > 0) {
      const imgLabels = images.map(img => `[Image: ${img.file.name}]`).join(' ')
      displayContent = displayContent ? `${displayContent}\n${imgLabels}` : imgLabels
    }

    const userMsg = { role: 'user', content: displayContent, createdAt: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setAttachedImages([])
    setLoading(true)
    setError(null)
    setRetryInfo(null)
    setStreamingText('')

    // Create or get conversation
    let convId = activeConv?.id
    if (!convId) {
      convId = await db.conversations.add({
        title: (userText || 'Image chat').slice(0, 50) + (userText.length > 50 ? '...' : ''),
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

    // System prompt + memories
    const memories = await db.memories.toArray()
    let systemPrompt = 'You are a helpful AI assistant.'
    if (memories.length > 0) {
      const memoryLines = memories.map(m => `- ${m.title}: ${m.content}`).join('\n')
      systemPrompt += `\n\nUser's saved notes:\n${memoryLines}`
    }
    apiMessages.push({ role: 'system', content: systemPrompt })

    // Add history (without multimodal for old messages)
    for (let i = 0; i < history.length - 1; i++) {
      apiMessages.push({ role: history[i].role, content: history[i].content })
    }

    // Last user message with images if present
    if (images.length > 0) {
      const multimodalContent = buildMultimodalContent(userText, images, settings.activeProvider)
      apiMessages.push({ role: 'user', content: multimodalContent })
    } else {
      apiMessages.push({ role: 'user', content: userText })
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

      const assistantMsg = { role: 'assistant', content: fullText, createdAt: Date.now(), conversationId: convId }
      await db.messages.add(assistantMsg)
      await db.conversations.update(convId, { updatedAt: Date.now() })

      setMessages(prev => [...prev, { role: 'assistant', content: fullText, createdAt: Date.now() }])
      setStreamingText('')
      loadConversations()
    } catch (err) {
      if (err.name !== 'AbortError') {
        const classified = err.classified
        setError(err.message)

        // Show retry countdown for retryable errors
        if (classified?.retryable && classified.retryAfter) {
          let countdown = classified.retryAfter
          setRetryInfo({ countdown, message: `Retrying in ${countdown}s...` })
          retryTimerRef.current = setInterval(() => {
            countdown--
            if (countdown <= 0) {
              clearInterval(retryTimerRef.current)
              setRetryInfo(null)
            } else {
              setRetryInfo({ countdown, message: `Retrying in ${countdown}s...` })
            }
          }, 1000)
        }

        // Save partial response if any streaming text accumulated
        if (streamingText) {
          const assistantMsg = { role: 'assistant', content: streamingText + '\n\n[Response interrupted]', createdAt: Date.now(), conversationId: convId }
          await db.messages.add(assistantMsg)
          setMessages(prev => [...prev, assistantMsg])
        }
      } else if (streamingText) {
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
      {/* Conversation sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} flex flex-col border-r transition-all duration-200 overflow-hidden md:w-64`}
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <div className="p-3 min-w-[256px] space-y-2">
          <button onClick={newChat}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            + New Chat
          </button>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-transparent outline-none"
              style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 min-w-[256px]">
          {filteredConversations.map(conv => (
            <div key={conv.id}
              onClick={() => editingConvId !== conv.id && selectConversation(conv)}
              className="group w-full text-left px-3 py-2 rounded-lg mb-1 text-sm transition-colors cursor-pointer flex items-center gap-1"
              style={{
                background: activeConv?.id === conv.id ? 'var(--bg-glass-hover)' : 'transparent',
                color: activeConv?.id === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeConv?.id === conv.id ? '1px solid var(--border-accent)' : '1px solid transparent',
              }}>
              {/* Pin indicator */}
              {conv.pinned && <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--accent)' }}>📌</span>}

              {/* Title (editable) */}
              {editingConvId === conv.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={() => handleRenameConversation(conv.id, editTitle)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameConversation(conv.id, editTitle)
                    if (e.key === 'Escape') setEditingConvId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 bg-transparent outline-none text-xs px-1 rounded"
                  style={{ border: '1px solid var(--border-accent)', color: 'var(--text-primary)' }}
                />
              ) : (
                <span className="truncate flex-1">{conv.title}</span>
              )}

              {/* Actions */}
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setEditingConvId(conv.id); setEditTitle(conv.title) }}
                  className="text-[10px] px-1 rounded cursor-pointer" style={{ color: 'var(--text-muted)' }}
                  title="Rename">✏️</button>
                <button onClick={(e) => handlePinConversation(e, conv.id)}
                  className="text-[10px] px-1 rounded cursor-pointer" style={{ color: 'var(--text-muted)' }}
                  title={conv.pinned ? 'Unpin' : 'Pin'}>📌</button>
                <button onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="text-[10px] px-1 rounded cursor-pointer" style={{ color: 'var(--danger)' }}
                  title="Delete">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0"
        onDrop={handleDrop}
        onDragOver={handleDragOver}>
        {/* Header */}
        <div className="h-14 flex items-center px-4 md:px-6 border-b gap-3"
          style={{ borderColor: 'var(--border-subtle)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
            {activeConv ? activeConv.title : 'New Chat'}
          </span>
          {settings.activeModel && (
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--accent-glow)', color: 'var(--accent-hover)' }}>
              {settings.activeModel}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {messages.length === 0 && !streamingText && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                E
              </div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Easy AI
              </h2>
              <p className="text-sm text-center px-4" style={{ color: 'var(--text-muted)' }}>
                {hasProvider
                  ? 'Start a conversation. Drop images or paste screenshots to chat with vision.'
                  : 'Configure an AI provider in Settings to get started.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} createdAt={msg.createdAt} />
          ))}

          {streamingText && (
            <MessageBubble role="assistant" content={streamingText + ' ▊'} createdAt={Date.now()} />
          )}

          {loading && !streamingText && (
            <div className="mb-4 flex justify-start">
              <div className="px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Error display with retry info */}
          {error && (
            <div className="mb-4 flex justify-start">
              <div className="max-w-[75%] px-4 py-3 rounded-2xl text-sm"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                <div>{error}</div>
                {retryInfo && (
                  <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {retryInfo.message}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Image previews */}
        {attachedImages.length > 0 && (
          <div className="px-4 md:px-6 pt-2 flex gap-2 flex-wrap">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img.preview} alt="" className="w-16 h-16 object-cover rounded-lg border"
                  style={{ borderColor: 'var(--border-subtle)' }} />
                <button onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer"
                  style={{ background: 'var(--danger)', color: '#fff' }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="px-4 md:px-6 pb-4 pt-2">
          <div className="flex gap-3 items-end p-3 rounded-2xl"
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            {/* File upload button */}
            <button onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
              title="Attach image">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
              onChange={e => { if (e.target.files.length) processFiles(Array.from(e.target.files)); e.target.value = '' }}
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={hasProvider ? 'Type a message... (drop or paste images)' : 'Configure a provider in Settings first'}
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
                disabled={(!input.trim() && attachedImages.length === 0) || !hasProvider}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                style={{
                  background: (input.trim() || attachedImages.length > 0) && hasProvider ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: (input.trim() || attachedImages.length > 0) && hasProvider ? '#fff' : 'var(--text-muted)',
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
