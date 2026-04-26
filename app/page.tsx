import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

const placeholderStreams = [
  { id: 'p1', name: 'Future Beats', dj: 'DJ Nexus', art: '/art/1.png', listeners: 342 },
  { id: 'p2', name: 'Sunset Sessions', dj: 'Aurora', art: '/art/2.png', listeners: 189 },
  { id: 'p3', name: 'Deep Aqua', dj: 'Coral', art: '/art/3.png', listeners: 256 },
  { id: 'p4', name: 'Cyber Matrix', dj: 'Volt', art: '/art/4.png', listeners: 128 },
]

const genres = [
  { name: 'Progressive', art: '/art/1.png' },
  { name: 'Deep House', art: '/art/2.png' },
  { name: 'Ambient', art: '/art/3.png' },
  { name: 'Techno', art: '/art/4.png' },
  { name: 'Trance', art: '/art/1.png' },
  { name: 'Chillout', art: '/art/3.png' },
  { name: 'Drum & Bass', art: '/art/2.png' },
]

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: liveStreams } = await supabase
    .from('live_streams')
    .select(`*, profiles ( username, avatar_url )`)
    .eq('is_live', true)

  const hasLive = liveStreams && liveStreams.length > 0

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content">
        <Topbar userEmail={user?.email} />

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>

          {/* ── Featured / Hero Row ── */}
          <section>
            <div className="section-title">Featured</div>
            <div className="card-row">
              {placeholderStreams.map((s) => (
                <div key={s.id} className="hero-card">
                  <Image src={s.art} alt={s.name} width={380} height={200} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  <div className="hero-card-overlay">
                    <div className="hero-card-title">{s.name}</div>
                    <div className="hero-card-sub">{s.dj} • {s.listeners} listening</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Live Now ── */}
          <section>
            <div className="section-title">🔴 Live Now</div>
            {hasLive ? (
              <div className="card-row">
                {liveStreams.map((stream: Record<string, unknown> & { id: string; name: string; listeners_count: number; profiles: { username: string | null } | null }) => (
                  <div key={stream.id} className="stream-card">
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
                    <div className="stream-card-overlay">
                      <div className="stream-card-title">{stream.name}</div>
                      <div className="stream-card-meta">
                        {stream.profiles?.username || 'Unknown DJ'} • {stream.listeners_count || 0} listeners
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'var(--surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                color: 'var(--muted)',
              }}>
                <p style={{ marginBottom: '16px', fontSize: '0.9375rem' }}>No one is streaming right now</p>
                <a href="/login" className="topbar-btn topbar-btn-primary" style={{ display: 'inline-block' }}>
                  Start Streaming
                </a>
              </div>
            )}
          </section>

          {/* ── Popular Channels ── */}
          <section>
            <div className="section-title">Popular Channels</div>
            <div className="card-row">
              {genres.map((g) => (
                <div key={g.name} className="stream-card">
                  <Image src={g.art} alt={g.name} width={180} height={180} className="stream-card-img" />
                  <div className="stream-card-overlay">
                    <div className="stream-card-title">{g.name}</div>
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
