const { createClient } = require('@supabase/supabase-js')
const { spawn } = require('child_process')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const activeRecordings = {} // mount -> child_process
const POLL_INTERVAL = 10000  // 10 seconds
const MAX_BACKOFF = 60000    // 1 minute max between retries
let consecutiveFailures = 0
let totalSyncs = 0

// ── Prevent the process from ever silently dying ──
process.on('uncaughtException', (err) => {
  console.error(`[FATAL] Uncaught exception: ${err.message}`)
  console.error(err.stack)
  // Don't exit — let the interval keep trying
})

process.on('unhandledRejection', (reason) => {
  console.error(`[FATAL] Unhandled rejection:`, reason)
  // Don't exit — let the interval keep trying
})

async function syncListeners() {
  try {
    const response = await fetch('http://localhost:8000/status-json.xsl', {
      signal: AbortSignal.timeout(8000) // Don't let a hung request block the loop
    })
    if (!response.ok) throw new Error(`Icecast status fetch failed: ${response.status}`)
    const data = await response.json()

    // ── Defensive parsing — Icecast sometimes returns partial/empty JSON ──
    if (!data || !data.icestats) {
      throw new Error('Icecast returned malformed response (missing icestats)')
    }

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
    const { data: dbStreams, error: dbError } = await supabase.from('live_streams').select('id, mount, record_stream, is_live')
    if (dbError) {
      throw new Error(`Supabase query failed: ${dbError.message}`)
    }

    const icecastMountPaths = icecastActiveMounts.map(am => am.mount)

    // Update each active stream in DB
    for (const s of icecastActiveMounts) {
      const { error: updateError } = await supabase.from('live_streams')
        .update({ listeners_count: s.listeners, is_live: true })
        .eq('mount', s.mount)

      if (updateError) {
        console.error(`Failed to update mount ${s.mount}: ${updateError.message}`)
      }

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

          curl.on('error', (err) => {
            console.error(`Recording process error for ${s.mount}: ${err.message}`)
            delete activeRecordings[s.mount]
          })
        }
      }
    }

    // Set streams to offline if they aren't in Icecast
    if (icecastMountPaths.length > 0) {
      await supabase.from('live_streams')
        .update({ is_live: false, listeners_count: 0 })
        .not('mount', 'in', `(${icecastMountPaths.join(',')})`)
        .eq('is_live', true)
    } else {
      // No active mounts at all — mark everything offline
      await supabase.from('live_streams')
        .update({ is_live: false, listeners_count: 0 })
        .eq('is_live', true)
    }

    // Stop recordings for mounts that are no longer active in Icecast
    for (const mount in activeRecordings) {
      if (!icecastMountPaths.includes(mount)) {
        console.log(`Stopping recording for ${mount} (stream ended)`)
        try {
          activeRecordings[mount].process.kill()
        } catch (_) { /* already dead */ }
        delete activeRecordings[mount]
      }
    }

    // Reset failure counter on success
    consecutiveFailures = 0
    totalSyncs++

    // Heartbeat log every ~5 minutes so you can confirm the loop is alive
    if (totalSyncs % 30 === 0) {
      console.log(`[HEARTBEAT] Synced ${totalSyncs} times. ${icecastActiveMounts.length} active streams. ${Object.keys(activeRecordings).length} recording. Uptime: ${Math.floor(process.uptime() / 60)}m`)
    }

  } catch (err) {
    consecutiveFailures++
    console.error(`[ERROR] Sync failed (attempt #${consecutiveFailures}): ${err.message}`)

    // On persistent failures, slow down to avoid hammering a dead service
    if (consecutiveFailures >= 5) {
      const backoff = Math.min(consecutiveFailures * POLL_INTERVAL, MAX_BACKOFF)
      console.warn(`[BACKOFF] ${consecutiveFailures} consecutive failures, next retry in ${backoff / 1000}s`)
    }
  }
}

// ── Main loop with adaptive scheduling ──
async function runLoop() {
  while (true) {
    await syncListeners()
    const delay = consecutiveFailures >= 5
      ? Math.min(consecutiveFailures * POLL_INTERVAL, MAX_BACKOFF)
      : POLL_INTERVAL
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

console.log('Starting enhanced sync loop (Listener + Recording)...')
console.log(`Poll interval: ${POLL_INTERVAL / 1000}s | Max backoff: ${MAX_BACKOFF / 1000}s`)
runLoop()
