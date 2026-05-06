'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'

export default function AvatarUpload({ userId, initialUrl }: { userId: string, initialUrl: string | null }) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)

      if (updateError) {
        throw updateError
      }

      setAvatarUrl(publicUrl)
      alert('Cover art updated successfully!')
      window.location.reload()
    } catch (error: any) {
      alert('Error uploading avatar: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--background)' }}>
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Cover Art" fill style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '10px', textAlign: 'center' }}>No Art</div>
        )}
      </div>
      <div>
        <label className="btn-go-live btn-go-live-off" style={{ cursor: uploading ? 'wait' : 'pointer', display: 'inline-block' }}>
          {uploading ? 'Uploading...' : 'Upload Cover Art'}
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '8px' }}>
          This will be displayed on your Live Streams and VOD Mixes.
        </p>
      </div>
    </div>
  )
}
