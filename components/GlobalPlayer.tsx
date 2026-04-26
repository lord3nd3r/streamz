'use client'

import { useAudio } from '@/context/AudioContext'
import Image from 'next/image'
import Link from 'next/link'

export default function GlobalPlayer() {
  const { activeStream, isPlaying, volume, togglePlay, updateVolume } = useAudio()

  if (!activeStream) return null

  return (
    <div className="global-player neon-border" style={{
      position: 'fixed',
      bottom: '24px',
      // Center in the space remaining after the 240px sidebar
      left: 'calc(240px + (100% - 240px) / 2)',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 240px - 48px)',
      maxWidth: '1000px',
      height: '76px',
      background: 'rgba(13, 21, 39, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      zIndex: 1000,
      border: '1px solid var(--border-color)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      {/* ── Left: Info ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
        <div className={isPlaying ? 'beat-pulse' : ''} style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
          <Image
            src={`/art/${(Math.abs(activeStream.name.charCodeAt(0) % 4) + 1)}.png`}
            alt={activeStream.name}
            fill
            style={{ borderRadius: '8px', objectFit: 'cover' }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <Link href={`/stream/${activeStream.id}`} className="neon-text" style={{ 
            fontSize: '14px', 
            fontWeight: 800, 
            textDecoration: 'none', 
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {activeStream.name}
          </Link>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
            DJ {activeStream.profiles?.username || 'Guest'}
          </div>
        </div>
      </div>

      {/* ── Center: Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <button 
          onClick={togglePlay}
          style={{ 
            background: 'var(--accent)', 
            border: 'none', 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 15px var(--accent)'
          }}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
      </div>

      {/* ── Right: Volume ── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 800 }}>VOL</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume} 
          onChange={(e) => updateVolume(parseFloat(e.target.value))}
          style={{ width: '80px', height: '4px', cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}
