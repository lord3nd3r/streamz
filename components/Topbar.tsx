import Link from 'next/link'

interface TopbarProps {
  userEmail?: string | null
}

export default function Topbar({ userEmail }: TopbarProps) {
  return (
    <div className="topbar">
      {userEmail ? (
        <>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{userEmail}</span>
          <Link href="/dashboard" className="topbar-btn topbar-btn-primary">Dashboard</Link>
        </>
      ) : (
        <>
          <Link href="/login" className="topbar-btn topbar-btn-outline">Log In</Link>
          <Link href="/register" className="topbar-btn topbar-btn-primary">Sign Up</Link>
        </>
      )}
    </div>
  )
}
