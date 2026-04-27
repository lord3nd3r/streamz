'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminClient({ initialStats, initialUsers }: { initialStats: any, initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', userId)
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentStatus } : u))
    }
  }

  const toggleBan = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId)
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Total Registered', value: initialStats.totalUsers, icon: '👥' },
          { label: 'Active Streams', value: initialStats.activeStreams, icon: '🔴' },
          { label: 'Total Listeners', value: initialStats.totalListeners, icon: '🎧' },
          { label: 'Online Now', value: initialStats.onlineNow, icon: '🟢' }
        ].map(stat => (
          <div key={stat.label} style={{ 
            background: 'var(--surface)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* User Management Table */}
      <div className="dash-section">
        <div className="dash-section-title">User Management</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--foreground)' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--muted)' }}>USER</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--muted)' }}>LAST SEEN</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--muted)' }}>STATUS</th>
                <th style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700 }}>{user.username || 'Anonymous'}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{user.id}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                    {new Date(user.last_seen).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {user.is_admin && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ADMIN</span>}
                      {user.is_banned && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>BANNED</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => toggleAdmin(user.id, user.is_admin)}
                      style={{ 
                        background: user.is_admin ? 'rgba(255,255,255,0.1)' : 'var(--accent)', 
                        border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginRight: '8px' 
                      }}
                    >
                      {user.is_admin ? 'Demote' : 'Make Admin'}
                    </button>
                    <button 
                      onClick={() => toggleBan(user.id, user.is_banned)}
                      style={{ 
                        background: user.is_banned ? '#10b981' : '#ef4444', 
                        border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' 
                      }}
                    >
                      {user.is_banned ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
