const { createClient } = require('@supabase/supabase-js')

// Note: fetch is native in Node 18+
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function syncListeners() {
  try {
    const response = await fetch('http://localhost:8000/status-json.xsl')
    const data = await response.json()
    
    let sources = data.icestats.source
    if (!sources) {
      // No active streams, set all to 0
      await supabase.from('live_streams').update({ listeners_count: 0, is_live: false }).eq('is_live', true)
      return
    }

    // Force to array
    if (!Array.isArray(sources)) sources = [sources]

    const activeMounts = sources.map(s => {
      // Icecast status-json usually gives full URL or just mount depending on version
      // We'll handle both
      let mount = s.listenurl || s.mount
      if (mount && mount.startsWith('http')) {
        const url = new URL(mount)
        mount = url.pathname
      }
      return { mount, listeners: s.listeners || 0 }
    })

    // Update each active stream
    for (const s of activeMounts) {
      await supabase.from('live_streams')
        .update({ listeners_count: s.listeners, is_live: true })
        .eq('mount', s.mount)
    }

    // Set others to offline if they aren't in Icecast anymore
    const activeMountPaths = activeMounts.map(am => am.mount)
    if (activeMountPaths.length > 0) {
      await supabase.from('live_streams')
        .update({ is_live: false, listeners_count: 0 })
        .not('mount', 'in', `(${activeMountPaths.join(',')})`)
        .eq('is_live', true)
    }

    console.log(`Synced ${activeMounts.length} active streams.`)
  } catch (err) {
    console.error('Sync failed:', err.message)
  }
}

console.log('Starting listener sync loop...')
setInterval(syncListeners, 10000)
syncListeners()
