'use client'

import { useAudio } from '@/context/AudioContext'
import Image from 'next/image'
import Link from 'next/link'

function PlayIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
  }
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
}

export default function GlobalPlayer() {
  const { activeStream, isPlaying, volume, togglePlay, updateVolume } = useAudio()

  if (!activeStream) return null

  return (
    <div className="global-player-container">
      <div className="player-id">
        <div className={isPlaying ? "player-art art-playing" : "player-art"}>
          <Image
            src={activeStream.profiles?.avatar_url || `/art/${(Math.abs(activeStream.name.charCodeAt(0) % 4) + 1)}.png`}
            alt=""
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <Link href={`/stream/${activeStream.id}`}>{activeStream.name}</Link>
          <div className="station-meta">DJ {activeStream.profiles?.username || 'Guest'}</div>
        </div>
      </div>
      <button className="icon-btn" onClick={togglePlay} type="button" aria-label={isPlaying ? 'Pause' : 'Play'}>
        <PlayIcon playing={isPlaying} />
      </button>
      <div className="player-vol-container">
        <span>Volume</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => updateVolume(parseFloat(e.target.value))}
          style={{ width: '96px', accentColor: '#f3f1ea' }}
        />
      </div>
    </div>
  )
}
