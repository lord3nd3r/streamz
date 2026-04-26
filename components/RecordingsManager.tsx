'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Recording {
  name: string
  size: string
  modified: string
  url: string
}

export default function RecordingsManager() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetch('/api/recordings')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load recordings')
        return res.json()
      })
      .then((data: { recordings: Recording[] }) => setRecordings(data.recordings || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const deleteRecording = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return
    try {
      const res = await fetch(`/api/recordings/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (res.ok) {
        setRecordings(prev => prev.filter(r => r.name !== name))
      }
    } catch {
      alert('Network error while deleting')
    }
  }

  const publishRecording = async (name: string) => {
    const title = prompt('Enter a title for this Mix:')
    if (!title) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('You must be logged in to publish a mix.')

    const { error } = await supabase.from('published_mixes').insert({
      dj_id: user.id,
      title: title,
      filename: name
    })

    if (error) alert('Error publishing: ' + error.message)
    else alert('Mix published successfully! It will now appear in the Archive.')
  }

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading recordings...</p>
  if (error) return <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>

  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', marginBottom: '12px' }}>
        {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
      </p>
      {recordings.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No recordings yet. Stream to create some!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', overflowY: 'auto' }}>
          {recordings.map((r) => (
            <div key={r.name} className="recording-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--muted)' }}>{r.size} • {r.modified}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  onClick={() => publishRecording(r.name)}
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Publish
                </button>
                <a href={r.url} style={{ color: 'var(--accent)', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 600 }}>Download</a>
                <button
                  onClick={() => deleteRecording(r.name)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
