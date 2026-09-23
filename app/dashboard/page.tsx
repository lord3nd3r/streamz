import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import RecordingsManager from '@/components/RecordingsManager'
import AvatarUpload from '@/components/AvatarUpload'
import type { Database } from '@/types/supabase'
import { disconnectMount, ensureStationPassword, issueStationPassword, removeStationPassword } from '@/lib/station-secrets'

type LiveStream = Database['public']['Tables']['live_streams']['Row']

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: streams } = await supabase.from('live_streams').select('*').eq('dj_id', user.id)

  async function toggleStream(formData: FormData) {
    'use server'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const streamId = formData.get('stream_id') as string
      const isLive = formData.get('is_live') === 'true'
      const { error } = await supabase.from('live_streams').update({ is_live: !isLive }).eq('id', streamId).eq('dj_id', user.id)
      if (error) throw error
      revalidatePath('/')
      revalidatePath('/dashboard')
    } catch (err) {
      console.error('Error toggling stream:', err)
    }
  }

  async function deleteStream(formData: FormData) {
    'use server'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const streamId = formData.get('stream_id') as string
      const { data: existing } = await supabase.from('live_streams').select('mount').eq('id', streamId).eq('dj_id', user.id).maybeSingle()
      const { error } = await supabase.from('live_streams').delete().eq('id', streamId).eq('dj_id', user.id)
      if (error) throw error
      if (existing?.mount) {
        removeStationPassword(existing.mount)
        await disconnectMount(existing.mount)
      }
      revalidatePath('/')
      revalidatePath('/dashboard')
    } catch (err) {
      console.error('Error deleting stream:', err)
    }
  }

  async function updateGenre(formData: FormData) {
    'use server'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const streamId = formData.get('stream_id') as string
      const genre = formData.get('genre') as string
      const { error } = await supabase.from('live_streams').update({ genre }).eq('id', streamId).eq('dj_id', user.id)
      if (error) throw error
      revalidatePath('/')
      revalidatePath('/dashboard')
    } catch (err) {
      console.error('Error updating genre:', err)
    }
  }

  async function toggleRecording(formData: FormData) {
    'use server'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const streamId = formData.get('stream_id') as string
      const recordStream = formData.get('record_stream') === 'true'
      const { error } = await supabase.from('live_streams').update({ record_stream: !recordStream }).eq('id', streamId).eq('dj_id', user.id)
      if (error) throw error
      revalidatePath('/dashboard')
    } catch (err) {
      console.error('Error toggling recording:', err)
    }
  }

  async function createStream(formData: FormData) {
    'use server'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const name = formData.get('name') as string
      const genre = formData.get('genre') as string || 'Other'
      if (!name) return
      const { data: p } = await supabase.from('profiles').select('username, is_banned').eq('id', user.id).single()
      if (p?.is_banned) return
      const username = p?.username || 'dj'
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const mount = `/live/${username}-${slug}-${Date.now().toString().slice(-6)}`
      issueStationPassword(mount)
      const { error } = await supabase.from('live_streams').insert({ dj_id: user.id, name, mount, genre, is_live: true })
      if (error) {
        removeStationPassword(mount)
        throw error
      }
      revalidatePath('/')
      revalidatePath('/dashboard')
    } catch (err) {
      console.error('Error creating stream:', err)
    }
  }
  
  const GENRES = ['Progressive', 'Deep House', 'Techno', 'Trance', 'Breakbeats', 'Drum & Bass', 'Dubstep', 'Hardstyle', 'Psytrance', 'Other']
  const icecastHost = process.env.ICECAST_HOST || 'localhost'
  const icecastPort = process.env.ICECAST_PORT || '8000'
  const stationPasswords: Record<string, string> = {}
  for (const stream of streams || []) {
    stationPasswords[stream.mount] = ensureStationPassword(stream.mount)
  }

  return (
    <>
      <Sidebar active="dashboard" />
      <div className="main-content">
        <Topbar userEmail={user.email} />

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Welcome back, {profile?.username || 'DJ'}
          </h1>

          <div className="dash-section">
            <div className="dash-section-title">DJ Profile</div>
            <AvatarUpload userId={user.id} initialUrl={profile?.avatar_url || null} />
          </div>

          {/* Create Stream */}
          <div className="dash-section">
            <div className="dash-section-title">Start New Stream</div>
            <form action={createStream} style={{ display: 'flex', gap: '12px', maxWidth: '600px' }}>
              <input name="name" type="text" required placeholder="My Live Set" className="form-input" style={{ flex: 1 }} />
              <select name="genre" className="form-input" style={{ width: '150px' }}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <button type="submit" className="btn-go-live btn-go-live-off" style={{ whiteSpace: 'nowrap' }}>
                Go live
              </button>
            </form>
          </div>

          {/* Streams */}
          <div className="dash-section">
            <div className="dash-section-title">Your Streams</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {streams && streams.length > 0 ? streams.map((stream: LiveStream) => (
                <div key={stream.id} className="stream-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '2px' }}>{stream.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {stream.mount} · {stream.listeners_count || 0} listeners
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <form action={updateGenre} style={{ display: 'flex', gap: '8px' }}>
                      <input type="hidden" name="stream_id" value={stream.id} />
                      <select 
                        name="genre" 
                        defaultValue={(stream as any).genre || 'Other'} 
                        className="form-input" 
                        style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem' }}
                      >
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <button type="submit" className="btn-go-live btn-go-live-off" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        Update
                      </button>
                    </form>

                    <form action={toggleRecording}>
                      <input type="hidden" name="stream_id" value={stream.id} />
                      <input type="hidden" name="record_stream" value={((stream as any).record_stream || false).toString()} />
                      <button 
                        type="submit" 
                        className={`btn-go-live ${((stream as any).record_stream) ? 'btn-go-live-on' : 'btn-go-live-off'}`}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: '100px' }}
                      >
                        {((stream as any).record_stream) ? '⏺ Recording On' : '⏺ Record Off'}
                      </button>
                    </form>
                    <form action={toggleStream}>
                      <input type="hidden" name="stream_id" value={stream.id} />
                      <input type="hidden" name="is_live" value={stream.is_live.toString()} />
                      <button type="submit" className={`btn-go-live ${stream.is_live ? 'btn-go-live-on' : 'btn-go-live-off'}`}>
                        {stream.is_live ? 'Go Offline' : 'Go Live'}
                      </button>
                    </form>
                    <form action={deleteStream}>
                      <input type="hidden" name="stream_id" value={stream.id} />
                      <button 
                        type="submit" 
                        title="Delete Stream"
                        style={{ 
                          background: 'rgba(255, 50, 50, 0.1)', 
                          color: '#ff4444', 
                          border: '1px solid rgba(255, 50, 50, 0.3)', 
                          borderRadius: '8px',
                          padding: '6px 12px', 
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                  </div>
                  <div className="creds">
                    <span>Server</span><code>{icecastHost}:{icecastPort}</code>
                    <span>Mount</span><code>{stream.mount}</code>
                    <span>Username</span><code>source</code>
                    <span>Password</span><code>{stationPasswords[stream.mount]}</code>
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No streams yet. Create one above!</p>
              )}
            </div>
          </div>

          {/* Recordings */}
          <div className="dash-section">
            <div className="dash-section-title">Recordings</div>
            <RecordingsManager />
          </div>

          {/* Config */}
          <div className="config-panel">
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>Streaming</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Each station has its own source password, listed on the station above. In OBS, Mixxx, or BUTT use server {icecastHost}, port {icecastPort}, username source, and that station&apos;s mount and password. Audio is MP3 or AAC.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
