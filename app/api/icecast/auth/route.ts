import { NextResponse } from 'next/server'
import { createAdminClient, normalizeMount, passwordMatches, ensureStationPassword } from '@/lib/station-secrets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function verdict(allowed: boolean, message: string) {
  const response = new NextResponse(allowed ? 'ok' : 'no', { status: 200 })
  response.headers.set('icecast-auth-user', allowed ? '1' : '0')
  response.headers.set('icecast-auth-message', message)
  return response
}

export async function POST(request: Request) {
  const params = new URLSearchParams(await request.text())
  const action = params.get('action') || 'stream_auth'
  if (action !== 'stream_auth') return verdict(true, 'ignored')

  const mount = normalizeMount(params.get('mount') || '')
  const pass = params.get('pass') || ''
  if (!mount) return verdict(false, 'missing mount')

  try {
    const admin = createAdminClient()
    const { data: stream } = await admin
      .from('live_streams')
      .select('dj_id')
      .eq('mount', mount)
      .maybeSingle()

    if (!stream?.dj_id) return verdict(false, 'unknown station')

    const { data: profile } = await admin
      .from('profiles')
      .select('is_banned')
      .eq('id', stream.dj_id)
      .maybeSingle()

    if (profile?.is_banned) return verdict(false, 'banned')

    ensureStationPassword(mount)
    if (!passwordMatches(mount, pass)) return verdict(false, 'bad password')
    return verdict(true, 'ok')
  } catch {
    return verdict(false, 'auth unavailable')
  }
}
