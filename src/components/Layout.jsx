import { Outlet, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/chat', label: 'Chat', icon: ChatIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/manage', label: 'Manage', icon: ManageIcon },
]

export default function Layout() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      {/* Sidebar - bottom bar on mobile, left rail on desktop */}
      <aside className="order-2 md:order-1 flex md:flex-col items-center justify-around md:justify-start py-2 md:py-4 px-4 md:px-0 gap-2 border-t md:border-t-0 md:border-r md:w-16"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>

        {/* Logo - hidden on mobile */}
        <div className="hidden md:flex w-10 h-10 rounded-xl items-center justify-center mb-4 font-bold text-lg"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          E
        </div>

        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'text-white'
                  : 'hover:text-white'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
            })}
            title={label}
          >
            <Icon />
          </NavLink>
        ))}
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function ManageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}
