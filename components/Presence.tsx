'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Presence() {
  // Stable client reference — no re-creation on every render
  const supabase = useMemo(() => createClient(), [])

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
