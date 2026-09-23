import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Image from 'next/image'
import Link from 'next/link'

export default async function GenrePage({ params }: { params: Promise<{ name: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Await the params Promise in Next.js 16+
  const { name } = await params
  
  // Decode the URL param (e.g. deep%20house -> deep house)
  const decodedName = decodeURIComponent(name)
  
  // Fetch all streams matching this genre (case-insensitive)
  const { data: streams } = await supabase
    .from('live_streams')
    .select('*, profiles(username)')
    .ilike('genre', decodedName)
    .order('is_live', { ascending: false }) // Live streams first
    .order('listeners_count', { ascending: false }) // Most listeners next

  // Capitalize for display title
  const displayTitle = decodedName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return (
    <>
      <Sidebar active="home" />
      <div className="main-content" style={{ paddingBottom: '100px' }}>
        <Topbar userEmail={user?.email} />

        <div className="page">
          <section>
            <div className="kicker">
              <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none', marginRight: '8px' }}>Home</Link>
              {displayTitle}
            </div>
            
            {streams && streams.length > 0 ? (
              <div className="station-list">
                {streams.map((stream) => (
                  <Link key={stream.id} href={`/stream/${stream.id}`} className="station-row" style={{ gridTemplateColumns: '76px 1fr' }}>
                    <span style={{ position: 'relative', width: 76, height: 76 }}>
                      <Image
                        src={`/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`}
                        alt=""
                        width={76}
                        height={76}
                        className="station-art"
                        style={{ filter: stream.is_live ? 'none' : 'grayscale(1) brightness(0.6)' }}
                      />
                      {stream.is_live && <span className="live-mark">Live</span>}
                    </span>
                    <span className="station-main">
                      <span className="station-name">{stream.name}</span>
                      <span className="station-meta">
                        DJ {stream.profiles?.username || 'Guest'} · {stream.is_live ? `${stream.listeners_count || 0} listening` : 'Offline'}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty">No stations in this genre yet.</div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
