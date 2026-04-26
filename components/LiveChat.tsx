'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Message {
  id: string
  username: string
  message: string
  created_at: string
}

export default function LiveChat({ streamId, djId }: { streamId: string, djId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [bannedUsers, setBannedUsers] = useState<string[]>([])
  const [mods, setMods] = useState<string[]>([])
  const chatScrollRef = useRef<HTMLDivElement>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch initial messages & user status
  useEffect(() => {
    const init = async () => {
      // Get current user if any
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        if (profile?.username) setUsername(profile.username)
        else setUsername(user.email?.split('@')[0] || 'User')
      }

      // Fetch bans and mods
      const { data: bans } = await supabase.from('chat_bans').select('banned_username').eq('stream_id', streamId)
      if (bans) setBannedUsers(bans.map(b => b.banned_username))

      const { data: modData } = await supabase.from('chat_mods').select('mod_username').eq('stream_id', streamId)
      if (modData) setMods(modData.map(m => m.mod_username))

      // Fetch last 50 messages
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (data) {
        setMessages(data.reverse())
      }
    }
    init()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`chat_${streamId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `stream_id=eq.${streamId}` 
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `stream_id=eq.${streamId}` 
      }, (payload) => {
        setMessages((prev) => prev.filter(m => m.id !== payload.old.id))
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_bans',
        filter: `stream_id=eq.${streamId}` 
      }, (payload) => {
        setBannedUsers((prev) => [...prev, payload.new.banned_username])
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_mods',
        filter: `stream_id=eq.${streamId}` 
      }, (payload) => {
        setMods((prev) => [...prev, payload.new.mod_username])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [streamId, supabase])

  // Auto-scroll to bottom (using scrollTop to prevent page shift)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  const isOp = userId === djId
  const isMod = isOp || (username && mods.includes(username))

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !username) return
    
    const msg = input.trim()
    setInput('') // Optimistic clear

    await supabase.from('chat_messages').insert({
      stream_id: streamId,
      username: username,
      message: msg
    })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(13, 21, 39, 0.6)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontWeight: 800 }}>
        💬 Live Chat
      </div>
      
      <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.filter(m => !bannedUsers.includes(m.username)).map((msg) => (
          <div key={msg.id} style={{ fontSize: '0.875rem', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            {isMod && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                <button 
                  onClick={() => supabase.from('chat_messages').delete().eq('id', msg.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '10px' }} title="Delete Message">🗑️</button>
                {isOp && msg.username !== username && !mods.includes(msg.username) && (
                  <button 
                    onClick={() => supabase.from('chat_mods').insert({ stream_id: streamId, mod_username: msg.username })}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '10px' }} title="Make Mod">⭐</button>
                )}
                {isOp && msg.username !== username && (
                  <button 
                    onClick={() => supabase.from('chat_bans').insert({ stream_id: streamId, banned_username: msg.username })}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '10px' }} title="Ban User">🚫</button>
                )}
              </div>
            )}
            <div>
              <span style={{ 
                color: mods.includes(msg.username) ? '#10b981' : 'var(--accent)', 
                fontWeight: 700, 
                marginRight: '8px' 
              }}>
                {mods.includes(msg.username) && '⭐ '}{msg.username}
              </span>
              <span style={{ color: '#fff' }}>{msg.message}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
        {bannedUsers.includes(username || '') ? (
          <div style={{ fontSize: '0.875rem', color: '#ff4444', textAlign: 'center', fontWeight: 700 }}>
            You have been banned from this chat.
          </div>
        ) : username ? (
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..." 
              className="form-input"
              style={{ flex: 1, height: '36px', padding: '0 12px', fontSize: '0.875rem' }}
              maxLength={200}
            />
            <button type="submit" className="form-btn-blue" style={{ height: '36px', padding: '0 16px', fontSize: '0.875rem' }}>
              Send
            </button>
          </form>
        ) : (
          <div style={{ fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center' }}>
            <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Log in</a> to chat
          </div>
        )}
      </div>
    </div>
  )
}
