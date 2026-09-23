'use client'

import { useAudio } from '@/context/AudioContext'
import Image from 'next/image'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

const GENRES = ['Progressive', 'Deep House', 'Techno', 'Trance', 'Breakbeats', 'Drum & Bass', 'Dubstep', 'Hardstyle']

function PlayIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
  }
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
}

export default function Home({ liveStreams: initialLiveStreams, userEmail }: { liveStreams: any[], userEmail?: string }) {
  const { activeStream, isPlaying, playStream, togglePlay } = useAudio()

  const handlePlayClick = (e: React.MouseEvent, stream: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (activeStream?.id === stream.id) togglePlay()
    else playStream(stream)
  }

  const copyMount = (e: React.MouseEvent<HTMLButtonElement>, stream: any) => {
    e.preventDefault()
    e.stopPropagation()
    const mount = stream.mount.startsWith('/live/') ? stream.mount.substring(6) : stream.mount.replace(/^\//, '')
    navigator.clipboard.writeText(`https://streamz.lol/live/${mount}`)
    const btn = e.currentTarget
    const original = btn.innerText
    btn.innerText = 'Copied'
    setTimeout(() => { btn.innerText = original }, 2000)
  }

  const groups = initialLiveStreams?.length
    ? Object.entries(
        initialLiveStreams.reduce((acc: Record<string, any[]>, stream: any) => {
          const genre = stream.genre || 'Other'
          if (!acc[genre]) acc[genre] = []
          acc[genre].push(stream)
          return acc
        }, {})
      )
    : []

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content">
        <Topbar userEmail={userEmail} />
        <div className="page">
          <header className="masthead">
            <h1>On air</h1>
            <p className="lead">
              Listen without an account. <Link href="/register">Register</Link> if you want a mount and a show of your own.
            </p>
          </header>

          {groups.length > 0 ? groups.map(([genre, streams]) => (
            <section key={genre}>
              <div className="kicker">{genre}</div>
              <div className="station-list">
                {streams.map((stream) => {
                  const playing = activeStream?.id === stream.id && isPlaying
                  return (
                    <Link key={stream.id} href={`/stream/${stream.id}`} className="station-row">
                      <span style={{ position: 'relative', width: 76, height: 76 }}>
                        <Image
                          src={stream.profiles?.avatar_url || `/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`}
                          alt=""
                          width={76}
                          height={76}
                          className={playing ? "station-art art-playing" : "station-art"}
                        />
                        <span className="live-mark">Live</span>
                      </span>
                      <span className="station-main">
                        <span className="station-name">{stream.name}</span>
                        <span className="station-meta">
                          DJ {stream.profiles?.username || 'Guest'} · {stream.listeners_count || 0} listening
                        </span>
                      </span>
                      <button type="button" className="text-btn" title="Copy direct MP3 link" onClick={(e) => copyMount(e, stream)}>
                        MP3
                      </button>
                      <button type="button" className="icon-btn" aria-label={playing ? 'Pause' : 'Play'} onClick={(e) => handlePlayClick(e, stream)}>
                        <PlayIcon playing={playing} />
                      </button>
                    </Link>
                  )
                })}
              </div>
            </section>
          )) : (
            <section>
              <div className="kicker">Live</div>
              <div className="empty">Nothing is on the air right now.</div>
            </section>
          )}

          <section>
            <div className="kicker">Genres</div>
            <div className="genre-grid">
              {GENRES.map((g, i) => (
                <Link key={g} href={`/genre/${encodeURIComponent(g)}`} className="genre-tile">
                  <Image src={`/art/${(i % 4) + 1}.png`} alt="" width={320} height={180} />
                  <span>{g}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
