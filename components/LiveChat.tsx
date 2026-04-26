'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Message {
  id: string
  username: string
  message: string
  created_at: string
}

export default function LiveChat({ streamId }: { streamId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
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
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
        if (profile?.username) setUsername(profile.username)
        else setUsername(user.email?.split('@')[0] || 'User')
      }

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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [streamId, supabase])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: '8px' }}>{msg.username}</span>
            <span style={{ color: '#fff' }}>{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
        {username ? (
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
