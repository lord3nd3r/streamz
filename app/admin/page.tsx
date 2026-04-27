import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import AdminClient from './AdminClient'

export const revalidate = 0

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  // Fetch initial stats
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { data: activeStreams } = await supabase.from('live_streams').select('listeners_count').eq('is_live', true)
  const { data: users } = await supabase.from('profiles').select('*').order('last_seen', { ascending: false }).limit(50)

  const stats = {
    totalUsers: totalUsers || 0,
    activeStreams: activeStreams?.length || 0,
    totalListeners: activeStreams?.reduce((acc, s) => acc + (s.listeners_count || 0), 0) || 0,
    onlineNow: users?.filter(u => {
      const lastSeen = new Date(u.last_seen || 0).getTime()
      return Date.now() - lastSeen < 5 * 60 * 1000 // 5 minutes
    }).length || 0
  }

  return (
    <>
      <Sidebar active="admin" />
      <div className="main-content">
        <Topbar userEmail={user.email} />

        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 className="neon-text" style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px' }}>
            Admin Control Center
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '40px' }}>
            Real-time site management and user moderation.
          </p>

          <AdminClient initialStats={stats} initialUsers={users || []} />
        </div>
      </div>
    </>
  )
}
