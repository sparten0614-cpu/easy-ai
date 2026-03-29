/**
 * Easy AI — BYOK Multi-Model API Router
 * Supports: OpenAI, Anthropic, Google Gemini, DeepSeek, Custom (OpenAI-compatible)
 * Pure client-side, no backend needed.
 * Supports vision/multimodal via image content blocks.
 */

/**
 * Classify API error for user-friendly messaging
 */
function classifyError(status, body, providerName) {
  const msg = typeof body === 'string' ? body : body?.error?.message || body?.message || JSON.stringify(body)

  if (status === 401 || status === 403) {
    return { type: 'auth', message: `Invalid API key for ${providerName}. Please check your key in Settings.`, retryable: false }
  }
  if (status === 429) {
    const retryAfter = parseInt(msg.match(/retry.after.*?(\d+)/i)?.[1] || '30')
    return { type: 'rate_limit', message: `Rate limited by ${providerName}. Please wait ${retryAfter}s before retrying.`, retryable: true, retryAfter }
  }
  if (status === 404) {
    return { type: 'not_found', message: `Model not found. The selected model may not be available on your ${providerName} plan.`, retryable: false }
  }
  if (status === 400) {
    return { type: 'bad_request', message: `${providerName} rejected the request: ${msg}`, retryable: false }
  }
  if (status === 500 || status === 502 || status === 503) {
    return { type: 'server', message: `${providerName} server error (${status}). Try again in a moment.`, retryable: true, retryAfter: 5 }
  }
  return { type: 'unknown', message: `${providerName} error (${status}): ${msg}`, retryable: false }
}

/**
 * Convert a File/Blob to base64 data URL
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Build multimodal content block for a user message with images
 * @param {string} text - User text
 * @param {Array} images - Array of {base64, mimeType} objects
 * @param {string} providerId - Provider ID for format differences
 */
function buildMultimodalContent(text, images, providerId) {
  if (!images || images.length === 0) return text

  switch (providerId) {
    case 'anthropic': {
      const content = []
      for (const img of images) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mimeType,
            data: img.base64.split(',')[1], // strip data:image/...;base64, prefix
          },
        })
      }
      if (text) content.push({ type: 'text', text })
      return content
    }
    case 'google': {
      // Gemini uses inline_data in parts
      const parts = []
      for (const img of images) {
        parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.base64.split(',')[1],
          },
        })
      }
      if (text) parts.push({ text })
      return parts // returned as parts array, not content
    }
    default: {
      // OpenAI format (also used by DeepSeek, custom)
      const content = []
      for (const img of images) {
        content.push({
          type: 'image_url',
          image_url: { url: img.base64 },
        })
      }
      if (text) content.push({ type: 'text', text })
      return content
    }
  }
}

/**
 * Build request for OpenAI-compatible API (OpenAI, DeepSeek, Custom)
 */
function buildOpenAIRequest(url, messages, model, apiKey, options = {}) {
  return {
    url: `${url}/chat/completions`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  }
}

/**
 * Build request for Anthropic Messages API
 */
function buildAnthropicRequest(messages, model, apiKey, options = {}) {
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMsgs = messages.filter(m => m.role !== 'system')

  const body = {
    model,
    messages: chatMsgs,
    stream: true,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
  }
  if (systemMsg) body.system = typeof systemMsg.content === 'string' ? systemMsg.content : systemMsg.content

  return {
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  }
}

/**
 * Build request for Google Gemini API
 */
function buildGeminiRequest(messages, model, apiKey, options = {}) {
  const systemInstruction = messages.find(m => m.role === 'system')
  const chatMsgs = messages.filter(m => m.role !== 'system')

  const contents = chatMsgs.map(m => {
    const role = m.role === 'assistant' ? 'model' : 'user'
    // If content is already parts array (multimodal), use directly
    if (Array.isArray(m.content)) {
      return { role, parts: m.content }
    }
    return { role, parts: [{ text: m.content }] }
  })

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
    },
  }
  if (systemInstruction) {
    const sysContent = typeof systemInstruction.content === 'string'
      ? systemInstruction.content
      : systemInstruction.content.find(c => c.text)?.text || ''
    body.systemInstruction = { parts: [{ text: sysContent }] }
  }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/**
 * Build the fetch request for any provider
 */
function buildRequest(provider, messages, model, apiKey, options) {
  const baseUrl = provider.baseUrl

  switch (provider.id) {
    case 'anthropic':
      return buildAnthropicRequest(messages, model, apiKey, options)
    case 'google':
      return buildGeminiRequest(messages, model, apiKey, options)
    case 'openai':
    case 'deepseek':
    default:
      return buildOpenAIRequest(baseUrl, messages, model, apiKey, options)
  }
}

/**
 * Parse SSE stream chunk based on provider type
 */
function parseStreamChunk(providerId, data) {
  if (data === '[DONE]') return { text: '', done: true }

  try {
    const json = JSON.parse(data)

    switch (providerId) {
      case 'anthropic': {
        if (json.type === 'content_block_delta') {
          return { text: json.delta?.text || '', done: false }
        }
        if (json.type === 'message_stop') {
          return { text: '', done: true }
        }
        return null
      }
      case 'google': {
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const done = json.candidates?.[0]?.finishReason === 'STOP'
        return { text, done }
      }
      default: {
        const delta = json.choices?.[0]?.delta
        if (!delta) return null
        if (json.choices[0].finish_reason) return { text: '', done: true }
        return { text: delta.content || '', done: false }
      }
    }
  } catch {
    return null
  }
}

/**
 * Stream a chat completion from any supported provider.
 * Now with classified error handling and retry support.
 */
export async function streamChat({ provider, model, messages, options = {}, onToken, onDone, onError, signal }) {
  const { url, ...requestInit } = buildRequest(provider, messages, model, provider.apiKey, options)

  if (signal) requestInit.signal = signal

  let fullText = ''

  try {
    const response = await fetch(url, requestInit).catch(err => {
      if (err.name === 'AbortError') throw err
      // Network error
      throw Object.assign(new Error(`Network error: Unable to reach ${provider.name}. Check your internet connection.`), {
        classified: { type: 'network', retryable: true, retryAfter: 3 },
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let parsed
      try { parsed = JSON.parse(errorBody) } catch { parsed = errorBody }
      const classified = classifyError(response.status, parsed, provider.name)
      const err = new Error(classified.message)
      err.classified = classified
      throw err
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data) continue

        const parsed = parseStreamChunk(provider.id, data)
        if (!parsed) continue
        if (parsed.done) break
        if (parsed.text) {
          fullText += parsed.text
          onToken?.(parsed.text)
        }
      }
    }

    onDone?.(fullText)
    return fullText
  } catch (err) {
    if (err.name === 'AbortError') {
      onDone?.(fullText)
      return fullText
    }
    onError?.(err)
    throw err
  }
}

export { buildMultimodalContent, classifyError }
