/**
 * Easy AI — BYOK Multi-Model API Router
 * Supports: OpenAI, Anthropic, Google Gemini, DeepSeek, Custom (OpenAI-compatible)
 * Pure client-side, no backend needed.
 */

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
  if (systemMsg) body.system = systemMsg.content

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

  const contents = chatMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
    },
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] }
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
      // All OpenAI-compatible providers (including custom)
      return buildOpenAIRequest(baseUrl, messages, model, apiKey, options)
  }
}

/**
 * Parse SSE stream chunk based on provider type
 * Returns { text, done } or null if chunk should be skipped
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
        // OpenAI-compatible (openai, deepseek, custom)
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
 *
 * @param {Object} params
 * @param {Object} params.provider - Provider object from settings {id, name, baseUrl, apiKey, models}
 * @param {string} params.model - Model ID
 * @param {Array} params.messages - Chat messages [{role, content}]
 * @param {Object} [params.options] - temperature, maxTokens
 * @param {function} params.onToken - Callback for each text token: (text) => void
 * @param {function} [params.onDone] - Callback when stream completes: (fullText) => void
 * @param {function} [params.onError] - Callback on error: (error) => void
 * @param {AbortSignal} [params.signal] - AbortController signal for cancellation
 * @returns {Promise<string>} Full response text
 */
export async function streamChat({ provider, model, messages, options = {}, onToken, onDone, onError, signal }) {
  const { url, ...requestInit } = buildRequest(provider, messages, model, provider.apiKey, options)

  if (signal) requestInit.signal = signal

  let fullText = ''

  try {
    const response = await fetch(url, requestInit)

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMsg
      try {
        const errorJson = JSON.parse(errorBody)
        errorMsg = errorJson.error?.message || errorJson.message || errorBody
      } catch {
        errorMsg = errorBody
      }
      throw new Error(`${provider.name} API error (${response.status}): ${errorMsg}`)
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
