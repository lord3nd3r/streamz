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

  const themeLabel = theme.charAt(0).toUpperCase() + theme.slice(1)

  return (
    <div className="header-actions">
      <button onClick={toggleTheme} className="header-btn header-btn-line" type="button">
        <span className="theme-dot" />
        {themeLabel}
      </button>
      {!userEmail ? (
        <>
          <a href="/login" className="header-btn">Log in</a>
          <a href="/register" className="header-btn header-btn-solid">Sign up</a>
        </>
      ) : (
        <>
          <span className="user-email">{userEmail}</span>
          <button onClick={handleSignOut} className="header-btn" type="button">Log out</button>
        </>
      )}
    </div>
  )
}
