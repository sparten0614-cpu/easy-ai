import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme() {
  return localStorage.getItem('easyai_theme') || 'system'
}

function resolveTheme(preference) {
  if (preference === 'system') return getSystemTheme()
  return preference
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredTheme)
  const [resolved, setResolved] = useState(() => resolveTheme(getStoredTheme()))

  useEffect(() => {
    const update = () => {
      if (preference === 'system') {
        setResolved(getSystemTheme())
      }
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [preference])

  useEffect(() => {
    setResolved(resolveTheme(preference))
    localStorage.setItem('easyai_theme', preference)
    document.documentElement.setAttribute('data-theme', resolveTheme(preference))
  }, [preference])

  return (
    <ThemeContext value={{ theme: resolved, preference, setTheme: setPreference }}>
      {children}
    </ThemeContext>
  )
}
