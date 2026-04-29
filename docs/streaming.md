# Streaming Guide

## Overview

Streamz uses [Icecast](https://icecast.org/) as the audio streaming server. DJs connect with a source client (OBS, BUTT, IceS, etc.) and broadcast audio. Listeners connect via standard HTTP audio streams. All streams are automatically recorded as MP3 files.

---

## Icecast Configuration

The Icecast server is configured via [`icecast.xml`](../icecast.xml) and runs as a Docker container.

### Key Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Port | `8000` | HTTP listener port |
| Max clients | `10,000` | Maximum concurrent listeners |
| Max sources | `20` | Maximum concurrent DJ streams |
| Queue size | `512 KB` | Per-client buffer |
| Source timeout | `30s` | Disconnect idle sources after 30s |
| Mount pattern | `/live/*` | Wildcard mount for all DJ streams |

### Authentication

| Credential | Environment Variable | Default |
|-----------|---------------------|---------|
| Source password | `ICECAST_SOURCE_PASSWORD` | `changeme` |
| Admin username | `ICECAST_ADMIN_USERNAME` | `admin` |
| Admin password | `ICECAST_ADMIN_PASSWORD` | `changeme` |

> ⚠️ **Change all default passwords before deploying to production.**

### Auto-Recording

All streams on `/live/*` mounts are automatically dumped to `/tmp/dumpfiles/` inside the container, which is mapped to `./recordings/` on the host:

```xml
<mount name="/live/*">
  <dump-file>/tmp/dumpfiles/%Y-%m-%d_%H-%M-%S.mp3</dump-file>
</mount>
```

Filenames follow the pattern: `2026-04-25_20-30-00.mp3`

---

## How to Stream

### Step 1: Create a Stream in the Dashboard

1. Log in at `/login`
2. Go to `/dashboard`
3. Enter a stream name and click **🎧 Go Live**
4. Note the mount path shown (e.g., `/live/djname-chill-vibes-123456`)

### Step 2: Configure Your Source Client

#### Using OBS Studio

1. Go to **Settings → Stream**
2. Set **Service** to `Custom...`
3. Set **Server** to `icecast://localhost:8000/live/your-mount`
4. Set **Stream Key** to your source password
5. Under **Output**, set audio codec to **MP3** at **128 kbps**
6. Click **Start Streaming**

#### Using BUTT (Broadcast Using This Tool)

1. Open BUTT → **Settings → Main**
2. Click **Add** to create a new server:
   - **Type:** Icecast
   - **Address:** `localhost`
   - **Port:** `8000`
   - **Password:** Your source password
   - **Mount:** `/live/your-mount`
   - **Icecast user:** `source`
3. Set **Audio → Codec** to **MP3**, **Bitrate** to **128 kbps**
4. Click the **Play** button to start streaming

#### Using IceS

```xml
<ices>
  <stream>
    <server>localhost</server>
    <port>8000</port>
    <password>your-source-password</password>
    <mount>/live/your-mount</mount>
    <protocol>http</protocol>
  </stream>
  <input>
    <module>alsa</module>
    <param name="rate">44100</param>
    <param name="channels">2</param>
  </input>
  <encode>
    <type>mp3</type>
    <nominal-bitrate>128000</nominal-bitrate>
    <samplerate>44100</samplerate>
    <channels>2</channels>
  </encode>
</ices>
```

### Step 3: Verify

- **Icecast admin panel:** [http://localhost:8000/admin/](http://localhost:8000/admin/) (login with admin credentials)
- **Listen in browser:** `http://localhost:8000/live/your-mount`
- **Home page:** Your stream should appear under 🔴 Live Now at [http://localhost:3000](http://localhost:3000)

---

## Mount Point Naming

Mount paths are auto-generated when you create a stream:

```
/live/{username}-{slug}-{timestamp}
```

| Part | Example | Source |
|------|---------|-------|
| `username` | `djcool` | From your profile |
| `slug` | `chill-vibes` | Slugified stream name |
| `timestamp` | `123456` | Last 6 digits of `Date.now()` |

Full example: `/live/djcool-chill-vibes-839201`

---

## Listening

Listeners can connect to any active stream mount point:

```
http://your-server:8000/live/mount-name
```

This works in:
- Any web browser (direct URL)
- VLC Media Player (**Media → Open Network Stream**)
- Any media player that supports HTTP MP3 streams

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Source connection refused" | Wrong password or port | Verify `ICECAST_SOURCE_PASSWORD` and port `8000` |
| Stream doesn't appear on home page | `is_live` not set | Check the dashboard — is the stream marked as live? |
| No recordings appearing | Icecast container can't write | Check volume mount permissions for `./recordings/` |
| Audio stuttering | High source timeout or low queue | Increase `queue-size` and `burst-size` in `icecast.xml` |
| "Mount in use" error | Previous source didn't disconnect | Wait for `source-timeout` (30s) or restart Icecast |
