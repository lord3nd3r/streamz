'use client'

import { useAudio } from '@/context/AudioContext'
import Image from 'next/image'

export default function MixesClient({ initialMixes }: { initialMixes: any[] }) {
  const { activeStream, isPlaying, playStream, togglePlay } = useAudio()

  if (initialMixes.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>No mixes have been published yet.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
      {initialMixes.map((mix) => {
        // Construct a pseudo-stream object for the AudioContext
        const pseudoStream = {
          id: mix.id,
          name: mix.title,
          mount: `/recordings/${mix.filename}`,
          profiles: mix.profiles
        }

        const isThisPlaying = activeStream?.id === mix.id && isPlaying

        return (
          <div key={mix.id} className="directory-card" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div 
              style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0, cursor: 'pointer' }}
              onClick={() => activeStream?.id === mix.id ? togglePlay() : playStream(pseudoStream)}
            >
              <Image 
                src={mix.profiles?.avatar_url || `/art/${(Math.abs(mix.title.charCodeAt(0) % 4) + 1)}.png`}
                alt="Mix Cover"
                fill
                style={{ borderRadius: '12px', objectFit: 'cover' }}
              />
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                background: 'rgba(0,0,0,0.4)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderRadius: '12px',
                opacity: isThisPlaying ? 1 : 0,
                transition: 'opacity 0.2s',
              }} className="mix-play-overlay">
                {isThisPlaying ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z"/></svg>
                )}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mix.title}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '8px' }}>
                DJ {mix.profiles?.username || 'Guest'}
              </div>
              <div style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700 }}>
                {new Date(mix.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
