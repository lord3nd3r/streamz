import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// IRCv3-inspired message types
type MessageType = 'PRIVMSG' | 'ACTION' | 'NOTICE'

interface ChatPayload {
  stream_id: string
  message: string
}

interface ChatResponse {
  ok: boolean
  type?: MessageType
  username?: string
  error?: string
}

// POST /api/chat — Sends a validated, IRCv3-style chat message
export async function POST(request: Request): Promise<NextResponse<ChatResponse>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is banned site-wide
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, is_banned')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 })
    }

    if (profile.is_banned) {
      return NextResponse.json({ ok: false, error: 'You are banned' }, { status: 403 })
    }

    const body: ChatPayload = await request.json()
    const { stream_id, message } = body

    if (!stream_id || !message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing stream_id or message' }, { status: 400 })
    }

    const trimmed = message.trim()
    if (!trimmed) {
      return NextResponse.json({ ok: false, error: 'Message cannot be empty' }, { status: 400 })
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
      return NextResponse.json({ ok: false, error: 'You are banned from this chat' }, { status: 403 })
    }

    // ── Parse IRC-style slash commands ──
    let msgType: MessageType = 'PRIVMSG'
    let finalMessage = trimmed.slice(0, 500)

    if (trimmed.startsWith('/')) {
      const spaceIdx = trimmed.indexOf(' ')
      const cmd = spaceIdx > 0 ? trimmed.slice(1, spaceIdx).toLowerCase() : trimmed.slice(1).toLowerCase()
      const args = spaceIdx > 0 ? trimmed.slice(spaceIdx + 1).trim() : ''

      switch (cmd) {
        case 'me': {
          // /me dances — ACTION message (IRC CTCP ACTION)
          if (!args) {
            return NextResponse.json({ ok: false, error: '/me requires an action text' }, { status: 400 })
          }
          msgType = 'ACTION'
          finalMessage = args.slice(0, 500)
          break
        }

        case 'shrug': {
          msgType = 'PRIVMSG'
          finalMessage = `${args ? args + ' ' : ''}¯\\_(ツ)_/¯`
          break
        }

        case 'tableflip': {
          msgType = 'PRIVMSG'
          finalMessage = `${args ? args + ' ' : ''}(╯°□°)╯︵ ┻━┻`
          break
        }

        case 'unflip': {
          msgType = 'PRIVMSG'
          finalMessage = `${args ? args + ' ' : ''}┬─┬ノ( º _ ºノ)`
          break
        }

        case 'np':
        case 'nowplaying': {
          // /np — reference to the stream they're in
          msgType = 'ACTION'
          finalMessage = 'is vibing to the stream 🎵'
          break
        }

        default: {
          // Unknown command — send as regular message including the slash
          msgType = 'PRIVMSG'
          finalMessage = trimmed.slice(0, 500)
          break
        }
      }
    }

    // Store the message — prefix ACTION messages so the client can detect the type
    const storedMessage = msgType === 'ACTION' ? `\x01ACTION ${finalMessage}\x01` : finalMessage

    const { error } = await supabase.from('chat_messages').insert({
      stream_id,
      username,
      message: storedMessage,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, type: msgType, username })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Server error' }, { status: 500 })
  }
}
