import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await params

  // Sanitize: strip directory traversal and enforce .mp3 extension
  const safeName = path.basename(name)
  if (!safeName.endsWith('.mp3')) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'recordings', safeName)

  try {
    await fs.unlink(filePath)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
