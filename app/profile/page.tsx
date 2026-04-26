import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Profile</h1>
        <div className="bg-card rounded-xl shadow-lg p-8 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="text-foreground font-medium">{user.email}</p>
          </div>
          {profile?.username && (
            <div>
              <label className="text-sm text-muted-foreground">Username</label>
              <p className="text-foreground font-medium">{profile.username}</p>
            </div>
          )}
          {profile?.full_name && (
            <div>
              <label className="text-sm text-muted-foreground">Full Name</label>
              <p className="text-foreground font-medium">{profile.full_name}</p>
            </div>
          )}
          {profile?.role && (
            <div>
              <label className="text-sm text-muted-foreground">Role</label>
              <p className="text-foreground font-medium capitalize">{profile.role}</p>
            </div>
          )}
        </div>
        <div className="mt-8">
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
