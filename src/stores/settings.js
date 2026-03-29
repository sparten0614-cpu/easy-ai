const SETTINGS_KEY = 'easyai_settings'

const defaults = {
  providers: [],
  activeProvider: null,
  activeModel: null,
  theme: 'dark',
  language: 'en',
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function addProvider(provider) {
  const s = getSettings()
  const existing = s.providers.findIndex(p => p.id === provider.id)
  if (existing >= 0) {
    s.providers[existing] = provider
  } else {
    s.providers.push(provider)
  }
  if (!s.activeProvider && s.providers.length > 0) {
    s.activeProvider = s.providers[0].id
  }
  saveSettings(s)
  return s
}

export function removeProvider(id) {
  const s = getSettings()
  s.providers = s.providers.filter(p => p.id !== id)
  if (s.activeProvider === id) {
    s.activeProvider = s.providers[0]?.id || null
  }
  saveSettings(s)
  return s
}

export const PROVIDER_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'google',
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    models: [],
  },
]
