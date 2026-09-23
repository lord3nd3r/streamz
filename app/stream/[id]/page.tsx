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
import LiveChat from '@/components/LiveChat'

export default function StreamPage() {
  const params = useParams()
  const streamId = params.id as string
  const [stream, setStream] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [showVisualizer, setShowVisualizer] = useState(false)
  const [showChat, setShowChat] = useState(false)
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

      if (data) setStream(data)
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
    } catch {
      await navigator.clipboard.writeText(fullUrl)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 3000)
    }
  }

  const copyMp3 = (e: React.MouseEvent<HTMLButtonElement>) => {
    const mount = stream.mount.startsWith('/live/') ? stream.mount.substring(6) : stream.mount.replace(/^\//, '')
    navigator.clipboard.writeText(`https://streamz.lol/live/${mount}`)
    const btn = e.currentTarget
    const original = btn.innerText
    btn.innerText = 'Copied'
    setTimeout(() => { btn.innerText = original }, 2000)
  }

  if (loading) return <div style={{ background: 'var(--background)', height: '100vh' }} />
  if (!stream) notFound()

  const playing = activeStream?.id === stream.id && isPlaying
  const art = stream.profiles?.avatar_url || `/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content">
        <Topbar userEmail={userEmail} />
        <div className="page">
          <div className="stage">
            <div className={playing ? "stage-art art-playing" : "stage-art"}>
              {showVisualizer ? (
                <Visualizer />
              ) : (
                <Image src={art} alt="" fill style={{ objectFit: 'cover' }} />
              )}
              {stream.is_live && <span className="live-mark">Live</span>}
            </div>

            <div className="stage-copy">
              <div className="kicker" style={{ marginTop: 0 }}>{stream.genre || 'Station'}</div>
              <h1>{stream.name}</h1>
              <p className="lead">DJ {stream.profiles?.username || 'Guest'}</p>
              <p className="station-meta" style={{ marginTop: 14 }}>{stream.listeners_count || 0} listening</p>
              <div className="stage-actions">
                <button
                  type="button"
                  className="icon-btn icon-btn-lg"
                  aria-label={playing ? 'Pause' : 'Play'}
                  onClick={() => activeStream?.id === stream.id ? togglePlay() : playStream(stream)}
                >
                  {playing ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                <button type="button" className="header-btn header-btn-line" onClick={handleShare}>
                  {shareStatus === 'idle' ? 'Share' : shareStatus === 'shortening' ? 'Copying' : 'Copied'}
                </button>
                <button type="button" className="header-btn header-btn-line" onClick={() => setShowVisualizer(!showVisualizer)}>
                  {showVisualizer ? 'Artwork' : 'Visuals'}
                </button>
                <button type="button" className="header-btn header-btn-line" onClick={() => setShowChat(!showChat)}>
                  {showChat ? 'Hide chat' : 'Chat'}
                </button>
                <button type="button" className="header-btn header-btn-line" onClick={copyMp3}>MP3</button>
                <Link href="/" className="header-btn">All stations</Link>
              </div>
            </div>

            {showChat && (
              <div className="stage-chat">
                <LiveChat streamId={stream.id} djId={stream.dj_id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
