import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import RecordingsManager from '@/components/RecordingsManager'
import type { Database } from '@/types/supabase'

type LiveStream = Database['public']['Tables']['live_streams']['Row']

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: streams } = await supabase
    .from('live_streams')
    .select('*')
    .eq('dj_id', user.id)

  async function toggleStream(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const streamId = formData.get('stream_id') as string
    const isLive = formData.get('is_live') === 'true'
    await supabase
      .from('live_streams')
      .update({ is_live: !isLive })
      .eq('id', streamId)
      .eq('dj_id', user.id)
    revalidatePath('/')
    revalidatePath('/dashboard')
  }

  async function createStream(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const name = formData.get('name') as string
    if (!name) return
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    const username = profile?.username || 'dj'
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const mount = `/live/${username}-${slug}-${Date.now().toString().slice(-6)}`
    const { error } = await supabase.from('live_streams').insert({
      dj_id: user.id,
      name,
      mount,
      is_live: true
    })
    if (error) {
      console.error('Failed to create stream:', error)
      return
    }
    revalidatePath('/')
    revalidatePath('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground">DJ Dashboard</h1>
          <a href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {profile?.username || user.email}
          </a>
        </header>

        <section className="bg-card p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Start New Stream</h2>
          <form action={createStream} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Stream Name
              </label>
              <input name="name" type="text" required placeholder="My Live Set" className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-green-500" />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              🎧 Go Live
            </button>
          </form>
        </section>

        <section className="bg-card p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Your Streams</h2>
          <div className="space-y-4">
            {streams && streams.length > 0 ? (
              streams.map((stream: LiveStream) => (
                <div key={stream.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-semibold">{stream.name}</h3>
                    <p className="text-sm text-muted-foreground">Mount: {stream.mount} | Listeners: {stream.listeners_count || 0}</p>
                  </div>
                  <form action={toggleStream}>
                    <input type="hidden" name="stream_id" value={stream.id} />
                    <input type="hidden" name="is_live" value={stream.is_live.toString()} />
                    <button type="submit" className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      stream.is_live
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}>
                      {stream.is_live ? 'Go Offline' : 'Go Live'}
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No streams yet. Create one above!</p>
            )}
          </div>
        </section>

        <section className="bg-card p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Recordings</h2>
          <RecordingsManager />
        </section>

        <section className="bg-muted p-8 rounded-xl">
          <h3 className="text-xl font-semibold mb-4 text-foreground">Streaming Config</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Server:</strong> {process.env.ICECAST_HOST || 'localhost'}:{process.env.ICECAST_PORT || '8000'}</p>
            <p><strong>Mount:</strong> /live/[your-mount]</p>
            <p><strong>Format:</strong> MP3 128kbps</p>
            <p className="text-xs text-muted-foreground">Use OBS or IceS source client. Contact admin for source password.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
