'use client'

import { createClient } from '@/lib/supabase/client'
import { notFound, useParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAudio } from '@/context/AudioContext'

export default function StreamPage({ userEmail }: { userEmail?: string }) {
  const params = useParams()
  const streamId = params.id as string
  const [stream, setStream] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { activeStream, isPlaying, playStream, togglePlay } = useAudio()
  const supabase = createClient()

  useEffect(() => {
    async function fetchStream() {
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
    fetchStream()
  }, [streamId, supabase])

  if (loading) return <div style={{ background: 'var(--background)', height: '100vh' }} />
  if (!stream) notFound()

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: '100px' }}>
        <Topbar userEmail={userEmail} />
        
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '40px',
          background: 'radial-gradient(circle at center, var(--surface) 0%, var(--background) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* ── Background Glows ── */}
          <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', background: 'var(--accent)', opacity: 0.1, filter: 'blur(100px)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '400px', height: '400px', background: 'var(--accent)', opacity: 0.1, filter: 'blur(100px)', borderRadius: '50%' }} />

          {/* ── Visualizer Content ── */}
          <div style={{ textAlign: 'center', zIndex: 1, maxWidth: '600px', width: '100%' }}>
            <div className={activeStream?.id === stream.id && isPlaying ? 'beat-pulse' : ''} style={{ marginBottom: '40px', position: 'relative', display: 'inline-block' }}>
              <Image
                src={`/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`}
                alt={stream.name}
                width={400}
                height={400}
                className="neon-border"
                style={{ borderRadius: '20px', objectFit: 'cover' }}
              />
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

            <h1 className="neon-text" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.03em' }}>
              {stream.name}
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '32px' }}>
              Performed by <span style={{ color: '#fff', fontWeight: 700 }}>DJ {stream.profiles?.username || 'Guest'}</span>
            </p>

            <div style={{ 
              background: 'rgba(0,0,0,0.4)', 
              backdropFilter: 'blur(10px)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              alignItems: 'center'
            }}>
              <button 
                onClick={() => activeStream?.id === stream.id ? togglePlay() : playStream(stream)}
                style={{ 
                  background: 'var(--accent)', 
                  border: 'none', 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 25px var(--accent)'
                }}
              >
                {activeStream?.id === stream.id && isPlaying ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: 'var(--muted)', fontSize: '0.875rem' }}>
                <span>👥 {stream.listeners_count || 0} Clubbers</span>
                <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>← Back to Hall</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
