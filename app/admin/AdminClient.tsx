'use client'

import { useState } from 'react'

interface AdminClientProps {
  initialStats: any
  initialUsers: any[]
  toggleAdminAction: (formData: FormData) => Promise<void>
  toggleBanAction: (formData: FormData) => Promise<void>
}

export default function AdminClient({ initialStats, initialUsers, toggleAdminAction, toggleBanAction }: AdminClientProps) {
  const [users, setUsers] = useState(initialUsers)

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
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <form action={async (formData) => {
                        await toggleAdminAction(formData)
                        // Optimistic update
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: !user.is_admin } : u))
                      }}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <input type="hidden" name="current_status" value={user.is_admin?.toString() || 'false'} />
                        <button 
                          type="submit"
                          style={{ 
                            background: user.is_admin ? 'rgba(255,255,255,0.1)' : 'var(--accent)', 
                            border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          {user.is_admin ? 'Demote' : 'Make Admin'}
                        </button>
                      </form>
                      <form action={async (formData) => {
                        await toggleBanAction(formData)
                        // Optimistic update
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: !user.is_banned } : u))
                      }}>
                        <input type="hidden" name="user_id" value={user.id} />
                        <input type="hidden" name="current_status" value={user.is_banned?.toString() || 'false'} />
                        <button 
                          type="submit"
                          style={{ 
                            background: user.is_banned ? '#10b981' : '#ef4444', 
                            border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' 
                          }}
                        >
                          {user.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </form>
                    </div>
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
