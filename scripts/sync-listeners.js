const { createClient } = require('@supabase/supabase-js')
const { spawn } = require('child_process')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const activeRecordings = {} // mount -> child_process

async function syncListeners() {
  try {
    const response = await fetch('http://localhost:8000/status-json.xsl')
    if (!response.ok) throw new Error(`Icecast status fetch failed: ${response.status}`)
    const data = await response.json()
    
    let sources = data.icestats.source
    if (!sources) sources = []
    if (!Array.isArray(sources)) sources = [sources]

    const icecastActiveMounts = sources.map(s => {
      let mount = s.listenurl || s.mount
      if (mount && mount.startsWith('http')) {
        const url = new URL(mount)
        mount = url.pathname
      }
      return { mount, listeners: s.listeners || 0 }
    })

    // Fetch stream info from DB to check recording preference
    const { data: dbStreams } = await supabase.from('live_streams').select('id, mount, record_stream, is_live')
    
    const icecastMountPaths = icecastActiveMounts.map(am => am.mount)

    // Update each active stream in DB
    for (const s of icecastActiveMounts) {
      await supabase.from('live_streams')
        .update({ listeners_count: s.listeners, is_live: true })
        .eq('mount', s.mount)

      // Handle Recording Logic
      const dbStream = dbStreams?.find(ds => ds.mount === s.mount)
      if (dbStream && dbStream.record_stream) {
        if (!activeRecordings[s.mount]) {
          console.log(`Starting recording for ${s.mount}...`)
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const filename = `${s.mount.replace(/\//g, '_')}_${timestamp}.mp3`
          const outPath = path.join('/tmp/dumpfiles', filename)
          
          // Use curl to record the stream
          const curl = spawn('curl', ['-s', `http://localhost:8000${s.mount}`, '-o', outPath])
          
          activeRecordings[s.mount] = {
            process: curl,
            filename: filename
          }

          curl.on('exit', (code) => {
            console.log(`Recording for ${s.mount} ended with code ${code}`)
            delete activeRecordings[s.mount]
          })
        }
      }
    }

    // Set streams to offline if they aren't in Icecast
    await supabase.from('live_streams')
      .update({ is_live: false, listeners_count: 0 })
      .not('mount', 'in', `(${icecastMountPaths.length > 0 ? icecastMountPaths.join(',') : 'NONE'})`)
      .eq('is_live', true)

    // Stop recordings for mounts that are no longer active in Icecast
    for (const mount in activeRecordings) {
      if (!icecastMountPaths.includes(mount)) {
        console.log(`Stopping recording for ${mount} (stream ended)`)
        activeRecordings[mount].process.kill()
        delete activeRecordings[mount]
      }
    }

    console.log(`Synced ${icecastActiveMounts.length} active streams. ${Object.keys(activeRecordings).length} recording.`)
  } catch (err) {
    console.error('Sync failed:', err.message)
  }
}

console.log('Starting enhanced sync loop (Listener + Recording)...')
setInterval(syncListeners, 10000)
syncListeners()
