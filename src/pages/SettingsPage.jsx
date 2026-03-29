import { useState, useEffect } from 'react'
import { getSettings, saveSettings, addProvider, removeProvider, PROVIDER_PRESETS } from '../stores/settings.js'

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings())
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customModels, setCustomModels] = useState('')
  const [editingProvider, setEditingProvider] = useState(null)

  function refreshSettings() {
    setSettings(getSettings())
  }

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

  function handleRemoveProvider(id) {
    removeProvider(id)
    refreshSettings()
  }

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
  }

  function handleUpdateApiKey(providerId, newKey) {
    const s = getSettings()
    const p = s.providers.find(p => p.id === providerId)
    if (p) {
      p.apiKey = newKey
      saveSettings(s)
      refreshSettings()
    }
    setEditingProvider(null)
  }

  const preset = PROVIDER_PRESETS.find(p => p.id === selectedPreset)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Configure your AI providers and API keys. All data is stored locally.
        </p>

        {/* Active model display */}
        {settings.activeProvider && settings.activeModel && (
          <div className="mb-6 p-4 rounded-xl"
            style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-accent)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--accent-hover)' }}>Active Model</div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {settings.providers.find(p => p.id === settings.activeProvider)?.name} / {settings.activeModel}
            </div>
          </div>
        )}

        {/* Provider list */}
        <div className="mb-6">
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Configured Providers
          </h2>

          {settings.providers.length === 0 ? (
            <div className="p-8 rounded-xl text-center"
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No providers configured. Add one to start chatting.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.providers.map(provider => (
                <div key={provider.id} className="p-4 rounded-xl"
                  style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {provider.name}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {provider.apiKey.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingProvider(editingProvider === provider.id ? null : provider.id)}
                        className="text-xs px-2 py-1 rounded cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}>
                        Edit Key
                      </button>
                      <button onClick={() => handleRemoveProvider(provider.id)}
                        className="text-xs px-2 py-1 rounded cursor-pointer"
                        style={{ color: 'var(--danger)' }}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {editingProvider === provider.id && (
                    <div className="mb-3 flex gap-2">
                      <input type="password"
                        defaultValue={provider.apiKey}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-transparent outline-none"
                        style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                        onKeyDown={e => e.key === 'Enter' && handleUpdateApiKey(provider.id, e.target.value)}
                      />
                      <button onClick={e => handleUpdateApiKey(provider.id, e.target.previousSibling.value)}
                        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                        style={{ background: 'var(--accent)', color: '#fff' }}>
                        Save
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {provider.models.map(model => (
                      <button key={model}
                        onClick={() => handleSetActive(provider.id, model)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        style={{
                          background: settings.activeProvider === provider.id && settings.activeModel === model
                            ? 'var(--accent)' : 'var(--bg-tertiary)',
                          color: settings.activeProvider === provider.id && settings.activeModel === model
                            ? '#fff' : 'var(--text-secondary)',
                          border: settings.activeProvider === provider.id && settings.activeModel === model
                            ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                        }}>
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add provider */}
        {!showAddProvider ? (
          <button onClick={() => setShowAddProvider(true)}
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            style={{ background: 'var(--bg-glass)', border: '1px dashed var(--border-subtle)', color: 'var(--text-secondary)' }}>
            + Add Provider
          </button>
        ) : (
          <div className="p-5 rounded-xl"
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-accent)' }}>
            <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
              Add Provider
            </h3>

            {/* Preset selection */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PROVIDER_PRESETS.map(p => (
                <button key={p.id}
                  onClick={() => setSelectedPreset(p.id)}
                  className="px-3 py-2 rounded-lg text-xs text-left transition-all cursor-pointer"
                  style={{
                    background: selectedPreset === p.id ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    border: selectedPreset === p.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                    color: selectedPreset === p.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  }}>
                  {p.name}
                </button>
              ))}
            </div>

            {selectedPreset && (
              <>
                {/* API Key */}
                <div className="mb-3">
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>API Key</label>
                  <input type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={`Enter your ${preset?.name || ''} API key`}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                    style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>

                {/* Custom provider fields */}
                {selectedPreset === 'custom' && (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Base URL</label>
                      <input type="text"
                        value={customUrl}
                        onChange={e => setCustomUrl(e.target.value)}
                        placeholder="https://api.example.com/v1"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Models (comma-separated)</label>
                      <input type="text"
                        value={customModels}
                        onChange={e => setCustomModels(e.target.value)}
                        placeholder="model-a, model-b"
                        className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                        style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </>
                )}

                {/* Available models preview */}
                {preset && preset.models.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Available Models</label>
                    <div className="flex flex-wrap gap-1.5">
                      {preset.models.map(m => (
                        <span key={m} className="text-xs px-2 py-1 rounded"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button onClick={resetForm}
                    className="px-4 py-2 rounded-lg text-sm cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}>
                    Cancel
                  </button>
                  <button onClick={handleAddProvider}
                    disabled={!apiKey.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                    style={{
                      background: apiKey.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: apiKey.trim() ? '#fff' : 'var(--text-muted)',
                    }}>
                    Add Provider
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
