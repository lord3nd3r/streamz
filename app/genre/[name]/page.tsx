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

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <section>
            <div className="section-title">
              <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none', marginRight: '8px' }}>Home /</Link>
              <span className="neon-text">{displayTitle}</span> Streams
            </div>
            
            {streams && streams.length > 0 ? (
              <div className="card-row" style={{ flexWrap: 'wrap' }}>
                {streams.map((stream) => (
                  <Link 
                    key={stream.id} 
                    href={`/stream/${stream.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div 
                      className="stream-card"
                      style={{ transition: 'all 0.3s ease' }}
                    >
                      <Image
                        src={`/art/${(Math.abs(stream.name.charCodeAt(0) % 4) + 1)}.png`}
                        alt={stream.name}
                        width={180}
                        height={180}
                        className="stream-card-img"
                        style={{ filter: stream.is_live ? 'none' : 'grayscale(100%) brightness(0.5)' }}
                      />
                      {stream.is_live && (
                        <div className="stream-card-live pulse-glow">
                          <span className="live-dot-sm" />
                          Live
                        </div>
                      )}
                      
                      <div className="stream-card-overlay" style={{ opacity: 1, background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div className="stream-card-title">{stream.name}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '2px' }}>
                              DJ {stream.profiles?.username || 'Guest'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div className="stream-card-meta">
                                {stream.is_live ? `${stream.listeners_count || 0} listening` : 'Offline'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', background: 'var(--surface)', borderRadius: '12px', color: 'var(--muted)', border: '1px dashed var(--border-color)' }}>
                No streams found in this genre yet.
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
