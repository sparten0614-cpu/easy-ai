import { useState } from 'react'
import { getSettings, saveSettings, addProvider, removeProvider, PROVIDER_PRESETS } from '../stores/settings.js'
import { useTheme } from '../stores/theme.jsx'

const TABS = [
  { id: 'providers', label: 'Providers', icon: ProviderIcon },
  { id: 'appearance', label: 'Appearance', icon: AppearanceIcon },
  { id: 'about', label: 'About', icon: AboutIcon },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings())
  const [activeTab, setActiveTab] = useState('providers')
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customModels, setCustomModels] = useState('')
  const [editingProvider, setEditingProvider] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const { theme, preference, setTheme } = useTheme()

  function refreshSettings() { setSettings(getSettings()) }

  function handleAddProvider() {
    if (!selectedPreset || !apiKey.trim()) return
    const preset = PROVIDER_PRESETS.find(p => p.id === selectedPreset)
    if (!preset) return
    const provider = {
      id: preset.id === 'custom' ? `custom_${Date.now()}` : preset.id,
      name: preset.name,
      baseUrl: preset.id === 'custom' ? customUrl.trim() : preset.baseUrl,
      apiKey: apiKey.trim(),
      models: preset.id === 'custom'
        ? customModels.split(',').map(m => m.trim()).filter(Boolean)
        : preset.models,
    }
    addProvider(provider)
    refreshSettings()
    resetForm()
  }

  function handleRemoveProvider(id) { removeProvider(id); refreshSettings() }

  function handleSetActive(providerId, model) {
    const s = getSettings()
    s.activeProvider = providerId
    s.activeModel = model
    saveSettings(s)
    refreshSettings()
  }

  function resetForm() {
    setShowAddProvider(false)
    setSelectedPreset('')
    setApiKey('')
    setCustomUrl('')
    setCustomModels('')
    setTestResult(null)
  }

  function handleUpdateApiKey(providerId, newKey) {
    const s = getSettings()
    const p = s.providers.find(p => p.id === providerId)
    if (p) { p.apiKey = newKey; saveSettings(s); refreshSettings() }
    setEditingProvider(null)
  }

  async function testConnection() {
    if (!apiKey.trim() || !selectedPreset) return
    setTesting(true)
    setTestResult(null)
    const preset = PROVIDER_PRESETS.find(p => p.id === selectedPreset)
    try {
      const baseUrl = selectedPreset === 'custom' ? customUrl.trim() : preset.baseUrl
      const res = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
        signal: AbortSignal.timeout(5000),
      })
      setTestResult(res.ok ? 'success' : `Error: ${res.status}`)
    } catch (err) {
      setTestResult(`Failed: ${err.message}`)
    }
    setTesting(false)
  }

  const preset = PROVIDER_PRESETS.find(p => p.id === selectedPreset)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Configure your AI providers and preferences. All data stored locally.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                background: activeTab === id ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === id ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === id ? 'var(--shadow-sm)' : 'none',
                border: activeTab === id ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}>
              <Icon active={activeTab === id} />
              {label}
            </button>
          ))}
        </div>

        {/* ========== Providers Tab ========== */}
        {activeTab === 'providers' && (
          <div>
            {/* Active model display */}
            {settings.activeProvider && settings.activeModel && (
              <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
                style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-accent)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: 'var(--accent-hover)' }}>Active Model</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {settings.providers.find(p => p.id === settings.activeProvider)?.name} / {settings.activeModel}
                  </div>
                </div>
              </div>
            )}

            {/* Provider list */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Configured Providers</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                  {settings.providers.length}
                </span>
              </div>

              {settings.providers.length === 0 ? (
                <EmptyState
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>}
                  title="No providers configured"
                  description="Add an AI provider to start chatting. Your API keys are stored locally."
                />
              ) : (
                <div className="space-y-3">
                  {settings.providers.map(provider => (
                    <div key={provider.id} className="p-4 rounded-xl"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                            {provider.name.slice(0, 2)}
                          </div>
                          <div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{provider.name}</span>
                            <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{provider.apiKey.slice(0, 8)}...</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingProvider(editingProvider === provider.id ? null : provider.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                            style={{ color: 'var(--text-muted)', background: 'var(--bg-glass)' }}>
                            Edit
                          </button>
                          <button onClick={() => handleRemoveProvider(provider.id)}
                            className="text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                            style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
                            Remove
                          </button>
                        </div>
                      </div>

                      {editingProvider === provider.id && (
                        <div className="mb-3 flex gap-2">
                          <input type="password" defaultValue={provider.apiKey}
                            className="flex-1 px-3 py-2 rounded-lg text-xs bg-transparent outline-none"
                            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateApiKey(provider.id, e.target.value)}
                          />
                          <button onClick={e => handleUpdateApiKey(provider.id, e.target.previousSibling.value)}
                            className="text-xs px-3 py-2 rounded-lg cursor-pointer font-medium"
                            style={{ background: 'var(--accent)', color: '#fff' }}>
                            Save
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {provider.models.map(model => {
                          const isActive = settings.activeProvider === provider.id && settings.activeModel === model
                          return (
                            <button key={model}
                              onClick={() => handleSetActive(provider.id, model)}
                              className="text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium"
                              style={{
                                background: isActive ? 'var(--accent)' : 'var(--bg-primary)',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                border: isActive ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                                boxShadow: isActive ? '0 2px 6px rgba(99, 102, 241, 0.25)' : 'none',
                              }}>
                              {model}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add provider */}
            {!showAddProvider ? (
              <button onClick={() => setShowAddProvider(true)}
                className="w-full py-3.5 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
                style={{ background: 'transparent', border: '2px dashed var(--border-default)', color: 'var(--text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Add Provider
              </button>
            ) : (
              <div className="p-5 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-accent)' }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Provider</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {PROVIDER_PRESETS.map(p => (
                    <button key={p.id}
                      onClick={() => setSelectedPreset(p.id)}
                      className="px-3 py-2.5 rounded-xl text-xs text-left transition-all cursor-pointer font-medium"
                      style={{
                        background: selectedPreset === p.id ? 'var(--accent-glow)' : 'var(--bg-primary)',
                        border: selectedPreset === p.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                        color: selectedPreset === p.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                      }}>
                      {p.name}
                    </button>
                  ))}
                </div>

                {selectedPreset && (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>API Key</label>
                      <div className="flex gap-2">
                        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                          placeholder={`Enter your ${preset?.name || ''} API key`}
                          className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-transparent outline-none"
                          style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
                        />
                        <button onClick={testConnection} disabled={!apiKey.trim() || testing}
                          className="px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer flex-shrink-0"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', color: testing ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                          {testing ? 'Testing...' : 'Test'}
                        </button>
                      </div>
                      {testResult && (
                        <div className="mt-2 text-xs px-3 py-1.5 rounded-lg"
                          style={{
                            background: testResult === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: testResult === 'success' ? 'var(--success)' : 'var(--danger)',
                          }}>
                          {testResult === 'success' ? 'Connection successful!' : testResult}
                        </div>
                      )}
                    </div>

                    {selectedPreset === 'custom' && (
                      <>
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Base URL</label>
                          <input type="text" value={customUrl} onChange={e => setCustomUrl(e.target.value)}
                            placeholder="https://api.example.com/v1"
                            className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent outline-none"
                            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Models (comma-separated)</label>
                          <input type="text" value={customModels} onChange={e => setCustomModels(e.target.value)}
                            placeholder="model-a, model-b"
                            className="w-full px-3 py-2.5 rounded-xl text-sm bg-transparent outline-none"
                            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--bg-primary)' }}
                          />
                        </div>
                      </>
                    )}

                    {preset && preset.models.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Available Models</label>
                        <div className="flex flex-wrap gap-1.5">
                          {preset.models.map(m => (
                            <span key={m} className="text-xs px-2.5 py-1 rounded-lg font-mono"
                              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <button onClick={resetForm}
                        className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}>
                        Cancel
                      </button>
                      <button onClick={handleAddProvider} disabled={!apiKey.trim()}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                        style={{
                          background: apiKey.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                          color: apiKey.trim() ? '#fff' : 'var(--text-muted)',
                          boxShadow: apiKey.trim() ? '0 2px 8px rgba(99, 102, 241, 0.25)' : 'none',
                        }}>
                        Add Provider
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========== Appearance Tab ========== */}
        {activeTab === 'appearance' && (
          <div>
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Theme</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light', icon: '☀️' },
                { id: 'dark', label: 'Dark', icon: '🌙' },
                { id: 'system', label: 'System', icon: '💻' },
              ].map(t => (
                <button key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: preference === t.id ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    border: preference === t.id ? '2px solid var(--accent)' : '2px solid var(--border-subtle)',
                    color: preference === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}>
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========== About Tab ========== */}
        {activeTab === 'about' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold"
                style={{ background: 'linear-gradient(135deg, var(--accent), #a78bfa)', color: '#fff', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)' }}>
                Ea
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Easy AI</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>v0.2.0 — BYOK Multi-Model AI Client</p>
              </div>
            </div>

            <div className="space-y-3">
              <InfoRow label="Storage" value="All data stored locally (IndexedDB + localStorage)" />
              <InfoRow label="Privacy" value="API keys never leave your browser" />
              <InfoRow label="Models" value="OpenAI, Anthropic, DeepSeek, Google AI, Custom" />
              <InfoRow label="License" value="MIT" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
        {icon}
      </div>
      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
      <span className="text-xs font-medium w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  )
}

function ProviderIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}

function AppearanceIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function AboutIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
