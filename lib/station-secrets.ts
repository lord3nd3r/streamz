import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

type Store = Record<string, string>

const secretsPath = process.env.STATION_SECRETS_PATH || '/config/station-secrets.json'
const icecastConfig = process.env.ICECAST_CONFIG || '/config/icecast.xml'

function readTag(name: string): string {
  try {
    const xml = fs.readFileSync(icecastConfig, 'utf8')
    const match = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))
    return match?.[1]?.trim() || ''
  } catch {
    return ''
  }
}

export function sourcePasswordFromConfig(): string {
  return readTag('source-password')
}

function withStore<T>(mutate: (store: Store) => T): T {
  const dir = path.dirname(secretsPath)
  fs.mkdirSync(dir, { recursive: true })
  const lock = `${secretsPath}.lock`
  let locked = false
  for (let attempt = 0; attempt < 40 && !locked; attempt++) {
    try {
      const fd = fs.openSync(lock, 'wx')
      fs.closeSync(fd)
      locked = true
    } catch {
      const until = Date.now() + 25
      while (Date.now() < until) { /* wait for the other writer */ }
    }
  }
  try {
    let store: Store = {}
    try {
      store = JSON.parse(fs.readFileSync(secretsPath, 'utf8')) as Store
    } catch {
      store = {}
    }
    const result = mutate(store)
    fs.writeFileSync(secretsPath, JSON.stringify(store, null, 2), { mode: 0o600 })
    return result
  } finally {
    if (locked) {
      try { fs.unlinkSync(lock) } catch { /* lock already cleared */ }
    }
  }
}

export function normalizeMount(mount: string): string {
  const bare = decodeURIComponent(mount.split('?')[0] || '').trim()
  if (!bare) return ''
  return bare.startsWith('/') ? bare : `/${bare}`
}

export function issueStationPassword(mount: string): string {
  const key = normalizeMount(mount)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(20)
  let password = ''
  for (let i = 0; i < 20; i++) password += alphabet[bytes[i] % alphabet.length]
  withStore((store) => { store[key] = password })
  return password
}

export function ensureStationPassword(mount: string): string {
  const key = normalizeMount(mount)
  return withStore((store) => {
    if (store[key]) return store[key]
    const legacy = sourcePasswordFromConfig()
    store[key] = legacy
    return legacy
  })
}

export function stationPassword(mount: string): string | null {
  const key = normalizeMount(mount)
  return withStore((store) => store[key] || null)
}

export function removeStationPassword(mount: string) {
  const key = normalizeMount(mount)
  withStore((store) => { delete store[key] })
}

export function passwordMatches(mount: string, given: string): boolean {
  const expected = stationPassword(mount)
  if (!expected || !given) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function disconnectMount(mount: string) {
  const key = normalizeMount(mount)
  if (!key) return
  const user = readTag('admin-user') || 'admin'
  const pass = readTag('admin-password')
  if (!pass) return
  const base = process.env.ICECAST_INTERNAL_URL || 'http://icecast:8000'
  const url = `${base}/admin/killsource?mount=${encodeURIComponent(key)}`
  try {
    await fetch(url, {
      headers: { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` },
      cache: 'no-store',
    })
  } catch {
    // Icecast may already be idle. The password check still blocks the next connection.
  }
}
