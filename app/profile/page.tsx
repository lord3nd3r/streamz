import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { revalidatePath } from 'next/cache'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select().eq('id', user.id).single()

  async function updateProfile(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const username = formData.get('username') as string
    const email = formData.get('email') as string

    // Update Profile
    if (username) {
      await supabase.from('profiles').update({ username }).eq('id', user.id)
    }

    // Update Email (Supabase handles re-verification)
    if (email && email !== user.email) {
      await supabase.auth.updateUser({ email })
    }

    revalidatePath('/profile')
  }

  return (
    <>
      <Sidebar active="profile" />
      <div className="main-content">
        <Topbar userEmail={user.email} />

        <div style={{ padding: '28px 32px', maxWidth: '640px' }}>
          <h1 className="neon-text" style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '28px' }}>Profile Settings</h1>

          <div className="dash-section">
            <form action={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="form-label">Email Address</label>
                <input 
                  name="email" 
                  type="email" 
                  defaultValue={user.email} 
                  className="form-input" 
                  placeholder="your@email.com"
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '6px' }}>
                  Note: Changing your email will require re-verification.
                </p>
              </div>

              <div>
                <label className="form-label">DJ Name (Public)</label>
                <input 
                  name="username" 
                  type="text" 
                  defaultValue={profile?.username || ''} 
                  className="form-input" 
                  placeholder="DJ Awesome"
                />
              </div>

              {profile?.role && (
                <div>
                  <label className="form-label">Account Role</label>
                  <div style={{ color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.9rem' }}>
                    {profile.role}
                  </div>
                </div>
              )}

              <button type="submit" className="form-btn form-btn-blue" style={{ marginTop: '10px' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
