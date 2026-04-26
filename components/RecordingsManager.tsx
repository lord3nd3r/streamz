'use client'

import { useState, useEffect } from 'react'

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
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
      }
    } catch {
      alert('Network error while deleting')
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading recordings...</div>
  if (error) return <div className="text-red-500 text-sm">{error}</div>

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-foreground">Recordings ({recordings.length})</h3>
      {recordings.length === 0 ? (
        <p className="text-muted-foreground">No recordings yet. Stream to create some!</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {recordings.map((r) => (
            <div key={r.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted">
              <div className="flex-1">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.size} • {r.modified}</p>
              </div>
              <div className="flex gap-2">
                <a href={r.url} className="text-blue-500 hover:underline text-sm">Download</a>
                <button
                  onClick={() => deleteRecording(r.name)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-500/10 transition-colors"
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
