'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Presence() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const updatePresence = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id)
      }
    }

    // Update immediately and then every 2 minutes
    updatePresence()
    const interval = setInterval(updatePresence, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [supabase])

  return null
}
