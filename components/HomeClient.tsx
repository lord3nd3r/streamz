'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export default function Home({ liveStreams: initialLiveStreams, userEmail }: { liveStreams: any[], userEmail?: string }) {
  const [activeStream, setActiveStream] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.8)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const togglePlay = (streamId: string, mount: string) => {
    if (activeStream === streamId) {
      audioRef.current?.pause()
      setActiveStream(null)
    } else {
      setActiveStream(streamId)
      if (audioRef.current) {
        // mount already includes the leading slash (e.g. /live/...)
        // Nginx is proxing the root domain directly for the web app, 
        // so we use the relative path to let Nginx handle the /live proxy.
        audioRef.current.src = `${mount}?t=${Date.now()}`
        audioRef.current.load()
        audioRef.current.play().catch(err => {
          console.error('Playback failed:', err)
        })
      }
    }
  }

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content">
        <Topbar userEmail={userEmail} />

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <audio ref={audioRef} crossOrigin="anonymous" />

          {/* ── Live Now ── */}
          <section>
            <div className="section-title">🔴 Live Now</div>
            {initialLiveStreams && initialLiveStreams.length > 0 ? (
              <div className="card-row">
                {initialLiveStreams.map((stream) => (
                  <div key={stream.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div 
                      className="stream-card"
                      onClick={() => togglePlay(stream.id, stream.mount)}
                      style={{ 
                        border: activeStream === stream.id ? '2px solid var(--accent)' : 'none',
                        boxShadow: activeStream === stream.id ? '0 0 20px rgba(59, 123, 245, 0.3)' : 'none'
                      }}
                    >
                      <Image
                        src={`/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`}
                        alt={stream.name}
                        width={180}
                        height={180}
                        className="stream-card-img"
                      />
                      <div className="stream-card-live">
                        <span className="live-dot-sm" />
                        Live
                      </div>
                      
                      <div className="stream-card-overlay" style={{ opacity: 1, background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div className="stream-card-title">{stream.name}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '2px' }}>
                              DJ {stream.profiles?.username || 'Guest'}
                            </div>
                            <div className="stream-card-meta">
                              {stream.listeners_count || 0} listening
                            </div>
                          </div>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: 'var(--accent)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                          }}>
                            {activeStream === stream.id ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><path d="M8 5v14l11-7z"/></svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {activeStream === stream.id && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>VOL</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.01" 
                              value={volume} 
                              onChange={(e) => setVolume(parseFloat(e.target.value))}
                              style={{ width: '60px', height: '4px' }}
                            />
                          </div>
                          <a 
                            href={`${stream.mount}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
                          >
                            🔗 Stream URL
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', background: 'var(--surface)', borderRadius: '12px', color: 'var(--muted)' }}>
                No active streams. Use OBS to go live!
              </div>
            )}
          </section>

          {/* ── Popular Genres ── */}
          <section>
            <div className="section-title">Popular Genres</div>
            <div className="card-row">
              {['Progressive', 'Deep House', 'Techno', 'Trance'].map((g, i) => (
                <div key={g} className="stream-card">
                  <Image src={`/art/${i+1}.png`} alt={g} width={180} height={180} className="stream-card-img" />
                  <div className="stream-card-overlay">
                    <div className="stream-card-title">{g}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </>
  )
}
