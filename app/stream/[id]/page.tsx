'use client'

import { createClient } from '@/lib/supabase/client'
import { notFound, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAudio } from '@/context/AudioContext'
import Visualizer from '@/components/Visualizer'

export default function StreamPage() {
  const params = useParams()
  const streamId = params.id as string
  const [stream, setStream] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'shortening' | 'copied'>('idle')
  const { activeStream, isPlaying, playStream, togglePlay } = useAudio()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email)

      const { data } = await supabase
        .from('live_streams')
        .select(`*, profiles ( username, avatar_url )`)
        .eq('id', streamId)
        .single()
      
      if (data) {
        setStream(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [streamId, supabase])

  const handleShare = async () => {
    setShareStatus('shortening')
    const fullUrl = window.location.href
    try {
      const res = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(fullUrl)}`)
      const data = await res.json()
      if (data.shorturl) {
        await navigator.clipboard.writeText(data.shorturl)
        setShareStatus('copied')
        setTimeout(() => setShareStatus('idle'), 3000)
      } else {
        throw new Error('Shortening failed')
      }
    } catch (err) {
      await navigator.clipboard.writeText(fullUrl)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 3000)
    }
  }

  if (loading) return <div style={{ background: 'var(--background)', height: '100vh' }} />
  if (!stream) notFound()

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '120px' }}>
        <Topbar userEmail={userEmail} />
        
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px',
          background: 'radial-gradient(circle at center, var(--surface) 0%, var(--background) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* ── Background Glows ── */}
          <div style={{ position: 'absolute', top: '20%', left: '20%', width: '600px', height: '600px', background: 'var(--accent)', opacity: 0.07, filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '600px', height: '600px', background: 'var(--accent)', opacity: 0.07, filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none' }} />

          {/* ── Visualizer / Artwork Container ── */}
          <div style={{ textAlign: 'center', zIndex: 1, width: '100%', maxWidth: '600px' }}>
            <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '400px', aspectRatio: '1/1', marginBottom: '60px' }}>
              {showVisualizer ? (
                <div className="neon-border pulse-glow" style={{ width: '100%', height: '100%', borderRadius: '20px', background: 'rgba(0,0,0,0.9)', overflow: 'hidden' }}>
                  <Visualizer />
                </div>
              ) : (
                <div className={activeStream?.id === stream.id && isPlaying ? 'beat-pulse' : ''} style={{ width: '100%', height: '100%' }}>
                  <Image
                    src={`/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`}
                    alt={stream.name}
                    fill
                    className="neon-border"
                    style={{ borderRadius: '20px', objectFit: 'cover' }}
                  />
                </div>
              )}
              
              {/* ── Centered Control Buttons ── */}
              <div style={{ 
                position: 'absolute', 
                bottom: '-24px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                display: 'flex', 
                gap: '12px', 
                zIndex: 10,
                width: 'max-content'
              }}>
                <button 
                  onClick={handleShare}
                  className="neon-border"
                  style={{
                    background: shareStatus === 'copied' ? '#10b981' : 'var(--surface)',
                    color: shareStatus === 'copied' ? '#fff' : 'var(--accent)',
                    padding: '10px 20px',
                    borderRadius: '24px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {shareStatus === 'idle' ? '🔗 SHARE' : shareStatus === 'shortening' ? '⏳ ...' : '✅ COPIED!'}
                </button>

                <button 
                  onClick={() => setShowVisualizer(!showVisualizer)}
                  className="neon-border"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--accent)',
                    padding: '10px 20px',
                    borderRadius: '24px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {showVisualizer ? '🖼️ SHOW ART' : '🌈 SHOW VISUALS'}
                </button>
              </div>

              {stream.is_live && (
                <div style={{ 
                  position: 'absolute', 
                  top: '20px', 
                  right: '20px', 
                  background: 'rgba(239, 68, 68, 0.9)', 
                  color: '#fff', 
                  padding: '6px 12px', 
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
                }}>
                  LIVE NOW
                </div>
              )}
            </div>

            <h1 className="neon-text" style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.04em' }}>
              {stream.name}
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '48px' }}>
              Performed by <span style={{ color: '#fff', fontWeight: 700 }}>DJ {stream.profiles?.username || 'Guest'}</span>
            </p>

            <div style={{ 
              background: 'rgba(0,0,0,0.5)', 
              backdropFilter: 'blur(20px)', 
              padding: '32px', 
              borderRadius: '24px', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              alignItems: 'center',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
            }}>
              <button 
                onClick={() => activeStream?.id === stream.id ? togglePlay() : playStream(stream)}
                style={{ 
                  background: 'var(--accent)', 
                  border: 'none', 
                  width: '72px', 
                  height: '72px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 30px var(--accent)',
                  transition: 'transform 0.2s'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {activeStream?.id === stream.id && isPlaying ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span>👥 {stream.listeners_count || 0} Clubbers</span>
                  <button 
                    onClick={(e) => {
                      const mount = stream.mount.startsWith('/live/') ? stream.mount.substring(6) : stream.mount.replace(/^\//, '');
                      const url = `https://streamz.lol/live/${mount}`;
                      navigator.clipboard.writeText(url);
                      const btn = e.currentTarget;
                      const originalText = btn.innerText;
                      btn.innerText = '✅ Copied!';
                      setTimeout(() => { btn.innerText = originalText; }, 2000);
                    }}
                    style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--accent)', 
                      fontSize: '11px', 
                      padding: '4px 10px', 
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    🔗 MP3 URL
                  </button>
                </div>
                <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>← BACK TO HALL</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
