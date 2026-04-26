'use client'

import { useAudio } from '@/context/AudioContext'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export default function Home({ liveStreams: initialLiveStreams, userEmail }: { liveStreams: any[], userEmail?: string }) {
  const { activeStream, isPlaying, playStream, togglePlay } = useAudio()

  const handlePlayClick = (e: React.MouseEvent, stream: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (activeStream?.id === stream.id) {
      togglePlay()
    } else {
      playStream(stream)
    }
  }

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content" style={{ paddingBottom: '100px' }}>
        <Topbar userEmail={userEmail} />

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* ── Hero / Instructions ── */}
          <section style={{ 
            background: 'rgba(59, 123, 245, 0.05)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '16px', 
            padding: '32px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent)', opacity: 0.05, filter: 'blur(60px)', borderRadius: '50%' }} />
            
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>
              Welcome to <span className="neon-text">STREAMZ</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '600px', marginBottom: '0' }}>
              🎧 <strong style={{ color: '#fff' }}>Listen</strong>: No registration needed. Just pick a DJ below and enter the club.<br />
              🎹 <strong style={{ color: '#fff' }}>DJ</strong>: Want to stream your own sets? <a href="/register" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Register here</a> to get your mount points and start playing.
            </p>
          </section>

          {/* ── Live Now ── */}
          <section>
            <div className="section-title">🔴 Live Now</div>
            {initialLiveStreams && initialLiveStreams.length > 0 ? (
              <div className="card-row">
                {initialLiveStreams.map((stream) => (
                  <Link 
                    key={stream.id} 
                    href={`/stream/${stream.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div 
                      className={`stream-card ${activeStream?.id === stream.id ? 'neon-border' : ''}`}
                      style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <Image
                        src={`/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`}
                        alt={stream.name}
                        width={180}
                        height={180}
                        className="stream-card-img"
                      />
                      <div className={`stream-card-live ${activeStream?.id === stream.id && isPlaying ? 'pulse-glow' : ''}`}>
                        <span className="live-dot-sm" />
                        Live
                      </div>
                      
                      <div className="stream-card-overlay" style={{ opacity: 1, background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div className={`stream-card-title ${activeStream?.id === stream.id ? 'neon-text' : ''}`}>{stream.name}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '2px' }}>
                              DJ {stream.profiles?.username || 'Guest'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div className="stream-card-meta">
                                {stream.listeners_count || 0} listening
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const mount = stream.mount.startsWith('/live/') ? stream.mount.substring(6) : stream.mount.replace(/^\//, '');
                                  const url = `https://streamz.lol/live/${mount}`;
                                  navigator.clipboard.writeText(url);
                                  alert('Copied Direct MP3 URL!');
                                }}
                                title="Copy direct MP3 link"
                                style={{ 
                                  background: 'rgba(255,255,255,0.1)', 
                                  border: 'none', 
                                  color: 'var(--accent)', 
                                  fontSize: '10px', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                              >
                                🔗 MP3
                              </button>
                            </div>
                          </div>
                          <div 
                            onClick={(e) => handlePlayClick(e, stream)}
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '50%', 
                              background: 'var(--accent)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              boxShadow: activeStream?.id === stream.id ? '0 0 15px var(--accent)' : 'none',
                              cursor: 'pointer'
                            }}
                          >
                            {activeStream?.id === stream.id && isPlaying ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '2px' }}><path d="M8 5v14l11-7z"/></svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', background: 'var(--surface)', borderRadius: '12px', color: 'var(--muted)', border: '1px dashed var(--border-color)' }}>
                The club is empty. Use Mixxx to go live!
              </div>
            )}
          </section>

          {/* ── Featured (Static) ── */}
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
