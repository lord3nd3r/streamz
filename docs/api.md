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

## Server Actions

Server actions are defined inline in `app/dashboard/page.tsx` and invoked via HTML form submissions.

### `createStream`

Creates a new live stream mount point.

**Trigger:** Form submission in the "Start New Stream" section

**Form fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `text` | Stream name (required) |

**Behavior:**
1. Authenticates the user
2. Looks up the user's username from `profiles`
3. Generates a mount path: `/live/{username}-{slug}-{timestamp}`
4. Inserts a row into `live_streams` with `is_live: true`
5. Revalidates `/` and `/dashboard`

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
3. Revalidates `/` and `/dashboard`
