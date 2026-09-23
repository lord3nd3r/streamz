# API Reference

All API routes are under `/api/` and require **authentication** via Supabase session cookies.

---

## Recordings

### List Recordings

```
GET /api/recordings
```

Returns all `.mp3` files in the `recordings/` directory.

**Authentication:** Required

**Response `200`:**

```json
{
  "recordings": [
    {
      "name": "2026-04-25_20-30-00.mp3",
      "size": "45.2 MB",
      "modified": "2026-04-25",
      "url": "/recordings/2026-04-25_20-30-00.mp3"
    }
  ]
}
```

**Response `200` (empty):**

```json
{
  "recordings": []
}
```

**Response `401`:**

```json
{
  "error": "Unauthorized"
}
```

**Source:** [`app/api/recordings/route.ts`](../app/api/recordings/route.ts)

---

### Delete Recording

```
DELETE /api/recordings/:name
```

Deletes a specific `.mp3` recording file.

**Authentication:** Required

**Parameters:**

| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| `name` | URL path | `string` | Filename of the recording (must end in `.mp3`) |

**Security:**
- Filename is sanitized with `path.basename()` to prevent directory traversal
- Only `.mp3` files can be deleted

**Response `200`:**

```json
{
  "success": true
}
```

**Response `400`:**

```json
{
  "error": "Invalid file type"
}
```

**Response `401`:**

```json
{
  "error": "Unauthorized"
}
```

**Response `404`:**

```json
{
  "error": "File not found"
}
```

**Source:** [`app/api/recordings/[name]/route.ts`](../app/api/recordings/[name]/route.ts)

---

## Icecast Authentication

### Source Authentication Endpoint

```
GET /api/icecast/auth
POST /api/icecast/auth
```

Authenticates Icecast DJ source connections for dynamic mount points using station-specific passwords or global fallback credentials.

**Authentication:** Handled via URL parameters / form data from Icecast source auth webhooks.

**Parameters:**

| Parameter | Location | Type | Description |
|-----------|----------|------|-------------|
| `action` | Query / Body | `string` | Icecast webhook action (e.g. `stream_auth`) |
| `mount` | Query / Body | `string` | Stream mount point (e.g. `/live/djname-stream`) |
| `pass` / `password` | Query / Body | `string` | Source password provided by DJ encoder |
| `user` | Query / Body | `string` | Optional username provided by DJ encoder |

**Response `200`:**

```
icecast-auth-user: 1
```
(HTTP header `icecast-auth-user: 1` grants access to stream on the requested mount)

**Response `401` / `403`:**

```json
{
  "error": "Forbidden"
}
```

**Source:** [`app/api/icecast/auth/route.ts`](../app/api/icecast/auth/route.ts) | [`lib/station-secrets.ts`](../lib/station-secrets.ts)

---

## Server Actions

Server actions are defined inline in `app/dashboard/page.tsx` and invoked via HTML form submissions.

### `createStream`

Creates a new live stream mount point and issues a unique station password.

**Trigger:** Form submission in the "Start New Stream" section

**Form fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `text` | Stream name (required) |

**Behavior:**
1. Authenticates the user
2. Looks up the user's username from `profiles`
3. Generates a mount path: `/live/{username}-{slug}-{timestamp}`
4. Issues and securely stores a unique station password via `ensureStationPassword()`
5. Inserts a row into `live_streams` with `is_live: true`
6. Revalidates `/` and `/dashboard`

---

### `toggleStream`

Toggles a stream between live and offline.

**Trigger:** Form submission on the "Go Live" / "Go Offline" button

**Form fields:**

| Field | Type | Description |
|-------|------|-------------|
| `stream_id` | `hidden` | UUID of the stream |
| `is_live` | `hidden` | Current live status as string (`"true"` or `"false"`) |

**Behavior:**
1. Authenticates the user
2. Flips `is_live` for the matching stream (scoped to the current user's `dj_id`)
3. Disconnects any active Icecast source if going offline via `disconnectMount()`
4. Revalidates `/` and `/dashboard`
