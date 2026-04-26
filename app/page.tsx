import { createClient } from '@/lib/supabase/server'
import HomeClient from '@/components/HomeClient'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: liveStreams } = await supabase
    .from('live_streams')
    .select(`*, profiles ( username, avatar_url )`)
    .eq('is_live', true)

  return <HomeClient liveStreams={liveStreams || []} userEmail={user?.email} />
}
