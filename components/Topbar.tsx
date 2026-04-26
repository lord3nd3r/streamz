'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Topbar({ userEmail }: { userEmail?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('streamz-theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const themes = ['dark', 'neon', 'cyber']
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length]
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    localStorage.setItem('streamz-theme', nextTheme)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="topbar">
      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={toggleTheme}
          className="topbar-btn neon-border"
          style={{ 
            background: 'var(--surface)', 
            color: 'var(--accent)', 
            cursor: 'pointer',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
          MODE: {theme.toUpperCase()}
        </button>
      </div>

      {!userEmail ? (
        <>
          <a href="/login" className="topbar-btn topbar-btn-outline">Log In</a>
          <a href="/register" className="topbar-btn topbar-btn-primary">Sign Up</a>
        </>
      ) : (
        <>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>{userEmail}</span>
          <button onClick={handleSignOut} className="topbar-btn topbar-btn-outline" style={{ cursor: 'pointer' }}>Log Out</button>
        </>
      )}
    </div>
  )
}
