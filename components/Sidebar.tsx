import Link from 'next/link'

interface SidebarProps {
  active?: 'home' | 'dashboard' | 'profile' | 'mixes' | 'admin'
}

const links = [
  { href: '/', id: 'home', label: 'Home' },
  { href: '/mixes', id: 'mixes', label: 'Mixes' },
  { href: '/dashboard', id: 'dashboard', label: 'Dashboard' },
  { href: '/profile', id: 'profile', label: 'Profile' },
  { href: '/admin', id: 'admin', label: 'Admin' },
] as const

export default function Sidebar({ active = 'home' }: SidebarProps) {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark">Streamz</Link>
      <nav className="site-nav">
        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className={`nav-link ${active === link.id ? 'nav-link-active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
