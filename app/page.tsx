import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: streams } = await supabase
    .from('live_streams')
    .select(`
      *,
      profiles (
        username,
        avatar_url
      )
    `)
    .eq('is_live', true)

  return (
    <div className="flex flex-col flex-1 items-center bg-background font-sans">
      <main className="flex flex-1 w-full max-w-4xl flex-col py-16 px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Streamz</h1>
          <p className="text-lg text-muted-foreground">Live DJ streaming platform</p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            🔴 Live Now
          </h2>
          {streams && streams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {streams.map((stream: Record<string, unknown> & { id: string; name: string; mount: string; listeners_count: number; profiles: { username: string | null; avatar_url: string | null } | null }) => (
                <div key={stream.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="font-semibold text-foreground">{stream.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    DJ: {stream.profiles?.username || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stream.listeners_count || 0} listeners
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <p className="text-muted-foreground mb-4">No one is streaming right now.</p>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Log in to start streaming
              </a>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
