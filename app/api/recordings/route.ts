import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dir = path.join(process.cwd(), 'recordings')
  try {
    const files = await fs.readdir(dir)
    const recordings = await Promise.all(
      files
        .filter(f => f.endsWith('.mp3'))
        .map(async (f) => {
          const safeName = path.basename(f)
          const filePath = path.join(dir, safeName)
          const stats = await fs.stat(filePath)
          return {
            name: safeName,
            size: Math.round(stats.size / 1024 / 1024 * 10) / 10 + ' MB',
            modified: stats.mtime.toISOString().split('T')[0],
            url: `/recordings/${safeName}`
          }
        })
    )
    return NextResponse.json({ recordings })
  } catch {
    return NextResponse.json({ recordings: [] })
  }
}
