import Link from 'next/link'

interface SidebarProps {
  active?: 'home' | 'dashboard' | 'profile' | 'mixes' | 'admin'
}

export default function Sidebar({ active = 'home' }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">STREAMZ</div>
      <nav className="sidebar-nav">
        <Link
          href="/"
          className={`sidebar-link ${active === 'home' ? 'sidebar-link-active' : ''}`}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </Link>
        <Link
          href="/mixes"
          className={`sidebar-link ${active === 'mixes' ? 'sidebar-link-active' : ''}`}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          Mix Archive
        </Link>
        <Link
          href="/dashboard"
          className={`sidebar-link ${active === 'dashboard' ? 'sidebar-link-active' : ''}`}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </Link>
        <Link
          href="/profile"
          className={`sidebar-link ${active === 'profile' ? 'sidebar-link-active' : ''}`}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </Link>
        <Link
          href="/admin"
          className={`sidebar-link ${active === 'admin' ? 'sidebar-link-active' : ''}`}
        >
          <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Admin Panel
        </Link>
      </nav>
    </aside>
  )
}
