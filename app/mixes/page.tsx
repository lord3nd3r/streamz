import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import Image from 'next/image'
import MixesClient from './MixesClient'

export const revalidate = 0

export default async function MixesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all published mixes with the DJ profile
  const { data: mixes } = await supabase
    .from('published_mixes')
    .select('*, profiles(username, avatar_url)')
    .order('created_at', { ascending: false })

  return (
    <>
      <Sidebar active="mixes" />
      <div className="main-content">
        <Topbar userEmail={user?.email} />

        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 className="neon-text" style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px' }}>
            Mix Archive
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '40px' }}>
            Listen back to legendary recorded sets from our DJs.
          </p>

          <MixesClient initialMixes={mixes || []} />
        </div>
      </div>
    </>
  )
}
