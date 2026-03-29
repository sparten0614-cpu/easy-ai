import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../stores/theme.jsx'

const navItems = [
  { to: '/chat', label: 'Chat', icon: ChatIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/manage', label: 'Manage', icon: ManageIcon },
]

export default function Layout() {
  const { theme, preference, setTheme } = useTheme()
  const location = useLocation()

  return (
    <div className="flex flex-col md:flex-row h-screen w-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar - bottom bar on mobile, left rail on desktop */}
      <aside className="order-2 md:order-1 flex md:flex-col items-center justify-around md:justify-start py-2 md:py-5 px-4 md:px-0 gap-1 md:gap-1 border-t md:border-t-0 md:border-r md:w-[68px] flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>

        {/* Logo - hidden on mobile */}
        <div className="hidden md:flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base"
            style={{ background: 'linear-gradient(135deg, var(--accent), #a78bfa)', color: '#fff', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}>
            Ea
          </div>
        </div>

        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className="group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
            style={({ isActive }) => ({
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
              boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
            })}
            title={label}
          >
            <Icon />
            {/* Tooltip - desktop only */}
            <span className="hidden md:block absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-subtle)' }}>
              {label}
            </span>
          </NavLink>
        ))}

        {/* Spacer */}
        <div className="hidden md:block flex-1" />

        {/* Theme toggle - desktop only */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden md:flex w-10 h-10 rounded-xl items-center justify-center transition-all duration-200 mb-2 cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </aside>

      {/* Main content */}
      <main className="order-1 md:order-2 flex-1 flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-primary)' }}>
        <Outlet />
      </main>
    </div>
  )
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ManageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
