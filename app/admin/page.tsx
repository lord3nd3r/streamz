import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import AdminClient from './AdminClient'
import { createAdminClient, disconnectMount } from '@/lib/station-secrets'

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

  // ── Server actions with admin re-verification ──
  async function toggleAdmin(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Re-verify caller is admin
    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!caller?.is_admin) return

    const targetId = formData.get('user_id') as string
    const currentStatus = formData.get('current_status') === 'true'
    await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', targetId)
    revalidatePath('/admin')
  }

  async function toggleBan(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Re-verify caller is admin
    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!caller?.is_admin) return

    const targetId = formData.get('user_id') as string
    const currentStatus = formData.get('current_status') === 'true'
    const banning = !currentStatus
    await supabase.from('profiles').update({ is_banned: banning }).eq('id', targetId)
    if (banning) {
      const admin = createAdminClient()
      const { data: mounts } = await admin.from('live_streams').select('mount').eq('dj_id', targetId)
      for (const row of mounts || []) {
        if (row.mount) await disconnectMount(row.mount)
      }
    }
    revalidatePath('/admin')
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
          <h1 style={{ fontSize: '1.7rem', fontWeight: 560, marginBottom: '8px', letterSpacing: '-0.03em' }}>
            Admin
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: '40px' }}>
            Site stats, accounts, and moderation.
          </p>

          <AdminClient
            initialStats={stats}
            initialUsers={users || []}
            toggleAdminAction={toggleAdmin}
            toggleBanAction={toggleBan}
          />
        </div>
      </div>
    </>
  )
}
