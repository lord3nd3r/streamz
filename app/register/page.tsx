'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
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
          <span style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #3b7bf5, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>STREAMZ</span>
        </div>
        <h1 className="auth-title">Create Account</h1>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="username" className="form-label">DJ Name</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="form-input" placeholder="DJ Awesome" required />
          </div>
          <div>
            <label htmlFor="email" className="form-label">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="you@example.com" required />
          </div>
          <div>
            <label htmlFor="password" className="form-label">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="form-btn form-btn-green">
            {loading ? 'Creating account…' : 'Start Streaming'}
          </button>
        </form>
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <a href="/login" className="form-link">Log in</a>
        </p>
      </div>
    </div>
  )
}
