import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select().eq('id', user.id).single()

  return (
    <>
      <Sidebar active="profile" />
      <div className="main-content">
        <Topbar userEmail={user.email} />

        <div style={{ padding: '28px 32px', maxWidth: '640px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '28px' }}>Profile</h1>

          <div className="dash-section">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px 24px', fontSize: '0.9375rem' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</span>
              <span style={{ color: '#fff' }}>{user.email}</span>

              {profile?.username && (
                <>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>DJ Name</span>
                  <span style={{ color: '#fff' }}>{profile.username}</span>
                </>
              )}

              {profile?.full_name && (
                <>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name</span>
                  <span style={{ color: '#fff' }}>{profile.full_name}</span>
                </>
              )}

              {profile?.role && (
                <>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</span>
                  <span style={{ color: '#fff', textTransform: 'capitalize' }}>{profile.role}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
