import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/chat — Sends a validated chat message
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is banned site-wide
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, is_banned')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.is_banned) {
      return NextResponse.json({ error: 'You are banned' }, { status: 403 })
    }

    const body = await request.json()
    const { stream_id, message } = body

    if (!stream_id || !message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing stream_id or message' }, { status: 400 })
    }

    // Enforce max length
    const sanitizedMessage = message.trim().slice(0, 200)
    if (!sanitizedMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    // Derive username server-side — never trust the client
    const username = profile.username || user.email?.split('@')[0] || 'User'

    // Check stream-level ban
    const { data: chatBan } = await supabase
      .from('chat_bans')
      .select('id')
      .eq('stream_id', stream_id)
      .eq('banned_username', username)
      .maybeSingle()

    if (chatBan) {
      return NextResponse.json({ error: 'You are banned from this chat' }, { status: 403 })
    }

    // Insert the message with the server-verified username
    const { error } = await supabase.from('chat_messages').insert({
      stream_id,
      username,
      message: sanitizedMessage,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
