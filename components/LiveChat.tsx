'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── IRCv3-inspired message types ──
interface ChatMessage {
  id: string
  username: string
  message: string
  created_at: string
}

type ParsedMessageType = 'PRIVMSG' | 'ACTION' | 'JOIN' | 'PART' | 'NOTICE'

interface ParsedMessage {
  id: string
  type: ParsedMessageType
  username: string
  text: string
  timestamp: Date
  raw: ChatMessage
}

interface ContextMenu {
  x: number
  y: number
  nick: string
}

// Parse CTCP ACTION framing: \x01ACTION text\x01
function parseMessage(msg: ChatMessage): ParsedMessage {
  let type: ParsedMessageType = 'PRIVMSG'
  let text = msg.message

  if (text.startsWith('\x01ACTION ') && text.endsWith('\x01')) {
    type = 'ACTION'
    text = text.slice(8, -1)
  }

  return { id: msg.id, type, username: msg.username, text, timestamp: new Date(msg.created_at), raw: msg }
}

// Format timestamp as HH:MM
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

// IRC-style nick coloring (deterministic hash → HSL)
function getNickColor(nick: string): string {
  let hash = 0
  for (let i = 0; i < nick.length; i++) {
    hash = nick.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = ((hash % 360) + 360) % 360
  const saturation = 70 + (Math.abs(hash >> 8) % 30)
  const lightness = 55 + (Math.abs(hash >> 16) % 20)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// ── Slash command help ──
const COMMANDS = [
  { cmd: '/me <action>', desc: 'Send an action (e.g. /me dances)' },
  { cmd: '/shrug [text]', desc: 'Append ¯\\_(ツ)_/¯' },
  { cmd: '/tableflip [text]', desc: 'Append (╯°□°)╯︵ ┻━┻' },
  { cmd: '/unflip [text]', desc: 'Append ┬─┬ノ( º _ ºノ)' },
  { cmd: '/np', desc: 'Show now-playing action' },
  { cmd: '/help', desc: 'Show this command list' },
  { cmd: '/clear', desc: 'Clear your local chat history' },
]

export default function LiveChat({ streamId, djId }: { streamId: string, djId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [djUsername, setDjUsername] = useState<string | null>(null)
  const [siteAdmins, setSiteAdmins] = useState<string[]>([])
  const [bannedUsers, setBannedUsers] = useState<string[]>([])
  const [mods, setMods] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)

  const supabase = useMemo(() => createClient(), [])

  // ── Init: fetch DJ, admins, user, bans, mods, messages ──
  useEffect(() => {
    const init = async () => {
      const { data: djProfile } = await supabase.from('profiles').select('username').eq('id', djId).single()
      if (djProfile?.username) setDjUsername(djProfile.username)

      const { data: admins } = await supabase.from('profiles').select('username').eq('is_admin', true)
      if (admins) setSiteAdmins(admins.map(a => a.username).filter(Boolean) as string[])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        if (profile?.username) setUsername(profile.username)
        else setUsername(user.email?.split('@')[0] || 'User')
      }

      const { data: bans } = await supabase.from('chat_bans').select('banned_username').eq('stream_id', streamId)
      if (bans) setBannedUsers(bans.map(b => b.banned_username))

      const { data: modData } = await supabase.from('chat_mods').select('mod_username').eq('stream_id', streamId)
      if (modData) setMods(modData.map(m => m.mod_username))

      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) setMessages(data.reverse())
    }
    init()

    // Realtime subscriptions
    const channel = supabase
      .channel(`chat_${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `stream_id=eq.${streamId}`
      }, (payload) => {
        setMessages(prev => [...prev.slice(-199), payload.new as ChatMessage])
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'chat_messages'
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_bans',
        filter: `stream_id=eq.${streamId}`
      }, (payload) => {
        setBannedUsers(prev => [...prev, payload.new.banned_username])
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_mods',
        filter: `stream_id=eq.${streamId}`
      }, (payload) => {
        setMods(prev => [...prev, payload.new.mod_username])
      })
      .subscribe()

    // Presence channel for user count
    const presenceChannel = supabase.channel(`presence_${streamId}`, {
      config: { presence: { key: 'user' } }
    })
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        setUserCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(presenceChannel)
    }
  }, [streamId, djId, supabase])

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  // Close context menu on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const isOp = userId === djId
  const isMod = isOp || (username && mods.includes(username))

  // IRC-style nick prefix: ~ for site admin, @ for channel DJ/mod
  const getNickPrefix = (nick: string): { char: string, color: string } | null => {
    if (siteAdmins.includes(nick)) return { char: '~', color: '#f59e0b' }
    if (nick === djUsername || mods.includes(nick)) return { char: '@', color: '#10b981' }
    return null
  }

  // ── Right-click context menu on nick ──
  const handleNickContext = (e: React.MouseEvent, nick: string) => {
    e.preventDefault()
    e.stopPropagation()
    // Position relative to the chat container
    const chatRect = chatScrollRef.current?.parentElement?.getBoundingClientRect()
    const x = e.clientX - (chatRect?.left || 0)
    const y = e.clientY - (chatRect?.top || 0)
    setCtxMenu({ x, y, nick })
  }

  // Context menu actions
  const ctxAction = async (action: string) => {
    if (!ctxMenu) return
    const nick = ctxMenu.nick
    setCtxMenu(null)

    switch (action) {
      case 'ban':
        setBannedUsers(prev => [...prev, nick])
        await supabase.from('chat_bans').insert({ stream_id: streamId, banned_username: nick })
        break
      case 'mod':
        setMods(prev => [...prev, nick])
        await supabase.from('chat_mods').insert({ stream_id: streamId, mod_username: nick })
        break
      case 'demod':
        setMods(prev => prev.filter(m => m !== nick))
        await supabase.from('chat_mods').delete().eq('stream_id', streamId).eq('mod_username', nick)
        break
      case 'purge':
        // Delete all messages from this user in this stream
        setMessages(prev => prev.filter(m => m.username !== nick))
        await supabase.from('chat_messages').delete().eq('stream_id', streamId).eq('username', nick)
        break
      case 'mention':
        setInput(prev => `${prev}${nick}: `)
        inputRef.current?.focus()
        break
    }
  }

  // Send message
  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !username || sending) return

    const trimmed = input.trim()
    setInput('')

    if (trimmed === '/help') { setShowHelp(prev => !prev); return }
    if (trimmed === '/clear') { setMessages([]); return }

    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: streamId, message: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('Chat error:', data.error)
        setInput(trimmed)
      }
    } catch (err) {
      console.error('Chat send error:', err)
      setInput(trimmed)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, username, sending, streamId])

  // Tab-complete commands
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && input.startsWith('/')) {
      e.preventDefault()
      const partial = input.slice(1).toLowerCase()
      const match = COMMANDS.find(c => c.cmd.slice(1).startsWith(partial))
      if (match) {
        setInput(match.cmd.split(' ')[0] + ' ')
      }
    }
  }

  const parsed = messages
    .filter(m => !bannedUsers.includes(m.username))
    .map(parseMessage)

  // ── Render a clickable nick with prefix ──
  const renderNick = (nick: string, isAction: boolean = false) => {
    const prefix = getNickPrefix(nick)
    const isSelf = nick === username
    const color = isSelf ? '#fff' : getNickColor(nick)

    return (
      <span
        onContextMenu={(e) => handleNickContext(e, nick)}
        style={{ cursor: isMod ? 'context-menu' : 'default' }}
      >
        {prefix && (
          <span style={{ color: prefix.color, marginRight: isAction ? '0' : '2px' }}>
            {prefix.char}
          </span>
        )}
        {isAction ? (
          <span style={{ color: getNickColor(nick), fontWeight: 700 }}>{nick}</span>
        ) : (
          <span style={{ color, fontWeight: 700 }}>{`<${nick}>`}</span>
        )}
      </span>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(6, 10, 20, 0.85)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px', overflow: 'hidden',
      fontFamily: 'var(--font-geist-mono), "JetBrains Mono", "Fira Code", monospace',
      position: 'relative',
    }}>
      {/* ── Channel header ── */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.8rem' }}>#live</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>|</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{userCount} online</span>
        </div>
        <button
          onClick={() => setShowHelp(prev => !prev)}
          style={{
            background: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--muted)', fontSize: '0.65rem', padding: '3px 8px',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 700,
            fontFamily: 'inherit',
          }}
        >
          /help
        </button>
      </div>

      {/* ── Command help panel ── */}
      {showHelp && (
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
          background: 'rgba(59, 123, 245, 0.05)', fontSize: '0.7rem',
        }}>
          <div style={{ color: 'var(--accent)', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.05em' }}>
            COMMANDS
          </div>
          {COMMANDS.map(c => (
            <div key={c.cmd} style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#10b981', fontWeight: 700, minWidth: '140px' }}>{c.cmd}</span>
              <span style={{ color: 'var(--muted)' }}>{c.desc}</span>
            </div>
          ))}
          {isMod && (
            <div style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              💡 Right-click a username for mod actions (ban, mod, purge)
            </div>
          )}
          <div style={{ color: 'var(--muted)', marginTop: '4px', fontStyle: 'italic', fontSize: '0.65rem' }}>
            Tab to autocomplete commands
          </div>
        </div>
      )}

      {/* ── Message area ── */}
      <div ref={chatScrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '8px 0',
        display: 'flex', flexDirection: 'column',
      }}>
        {parsed.map((msg) => (
          <div
            key={msg.id}
            style={{
              padding: '2px 16px', fontSize: '0.8rem', lineHeight: 1.5,
              display: 'flex', alignItems: 'flex-start', gap: '0',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {/* Timestamp */}
            <span style={{
              color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem',
              minWidth: '42px', flexShrink: 0, paddingTop: '1px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatTime(msg.timestamp)}
            </span>

            {/* Message content */}
            {msg.type === 'ACTION' ? (
              <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                • {renderNick(msg.username, true)}{' '}{msg.text}
              </span>
            ) : (
              <span>
                {renderNick(msg.username)}
                {' '}
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{msg.text}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Right-click context menu ── */}
      {ctxMenu && isMod && (
        <div
          ref={ctxMenuRef}
          style={{
            position: 'absolute',
            left: Math.min(ctxMenu.x, 200),
            top: ctxMenu.y,
            background: '#0c1425',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '4px 0',
            minWidth: '160px',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
          }}
        >
          <div style={{
            padding: '6px 12px', color: getNickColor(ctxMenu.nick),
            fontWeight: 800, borderBottom: '1px solid var(--border-color)',
            fontSize: '0.7rem',
          }}>
            {(() => {
              const p = getNickPrefix(ctxMenu.nick)
              return p ? `${p.char}${ctxMenu.nick}` : ctxMenu.nick
            })()}
          </div>

          {/* Anyone can mention */}
          <button onClick={() => ctxAction('mention')} style={ctxBtnStyle}>
            💬 Mention
          </button>

          {/* Mod/Op actions */}
          {isMod && ctxMenu.nick !== username && (
            <>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
              <button onClick={() => ctxAction('purge')} style={ctxBtnStyle}>
                🗑️ Purge Messages
              </button>
              {isOp && (
                <>
                  {mods.includes(ctxMenu.nick) ? (
                    <button onClick={() => ctxAction('demod')} style={ctxBtnStyle}>
                      ⭐ Remove Mod
                    </button>
                  ) : (
                    <button onClick={() => ctxAction('mod')} style={ctxBtnStyle}>
                      ⭐ Make Mod
                    </button>
                  )}
                  <button onClick={() => ctxAction('ban')} style={{ ...ctxBtnStyle, color: '#ef4444' }}>
                    🚫 Ban from Chat
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)' }}>
        {bannedUsers.includes(username || '') ? (
          <div style={{ fontSize: '0.75rem', color: '#ff4444', textAlign: 'center', fontWeight: 700 }}>
            You have been banned from this channel.
          </div>
        ) : username ? (
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0' }}>
            <span style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
              borderRight: 'none', borderRadius: '6px 0 0 6px',
              padding: '0 10px', display: 'flex', alignItems: 'center',
              color: getNickColor(username), fontSize: '0.75rem', fontWeight: 700,
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              {username}&gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or /help..."
              style={{
                flex: 1, height: '32px', padding: '0 10px', fontSize: '0.8rem',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                borderLeft: 'none', borderRight: 'none',
                color: 'var(--foreground)', outline: 'none',
                fontFamily: 'inherit',
              }}
              maxLength={500}
              disabled={sending}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={sending}
              style={{
                background: 'var(--accent)', border: 'none',
                borderRadius: '0 6px 6px 0', padding: '0 14px',
                fontSize: '0.7rem', fontWeight: 800, color: '#fff',
                cursor: sending ? 'wait' : 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.05em',
              }}
            >
              SEND
            </button>
          </form>
        ) : (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>
            <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>Log in</a> to chat
          </div>
        )}
      </div>
    </div>
  )
}

// Shared style for context menu buttons
const ctxBtnStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none',
  color: 'var(--foreground)', padding: '6px 12px',
  cursor: 'pointer', fontSize: '0.75rem',
  fontFamily: 'inherit',
}
