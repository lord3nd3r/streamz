'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [banned, setBanned] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('banned') === '1') setBanned(true)
  }, [])
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span className="wordmark">Streamz</span>
        </div>
        <h1 className="auth-title">Welcome Back</h1>
        {banned && <div className="form-error">This account is banned.</div>}
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="you@example.com" required />
          </div>
          <div>
            <label htmlFor="password" className="form-label">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="form-btn form-btn-blue">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)' }}>
          Don&apos;t have an account?{' '}
          <a href="/register" className="form-link">Sign up</a>
        </p>
      </div>
    </div>
  )
}
