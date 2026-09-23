# Streamz

A modern **Live DJ Streaming & Audio Platform** built with **Next.js 16**, **Supabase**, and **Icecast**.

DJs can register, manage stream mount points, obtain secure station source credentials, and stream live audio via Icecast. Listeners can explore live streams, browse genre directories, listen via a persistent docked audio player with a WebGL visualizer, participate in real-time chat, and listen to recorded mixes.

---

## Key Features

- **Dynamic DJ Streaming & Mount Management**: DJs create and manage audio mounts (`/live/...`) with station secrets authenticated by an Icecast HTTP webhook endpoint.
- **Station Secrets & Security**: Automatic per-mount station passwords, secure lock-backed password store, and source disconnect (`killsource`) controls.
- **Persistent Global Audio Player**: Fixed bottom player bar with stream recovery, auto-reconnect backoff, stall detection, and volume control.
- **WebGL Audio Visualizer**: 8 MilkDrop/Geiss-inspired GLSL shader presets (Warp Tunnel, Plasma Morph, Kaleidoscope, Starfield, Fractal Wave, Liquid Mirror, Geiss Pulse, Acid Worm) with feedback loops and full-screen support.
- **IRCv3-Style Live Chat**: Real-time per-stream chat with deterministic nick coloring, `/me` action support, command history, and DJ/Admin moderation (delete message, mod user, ban user).
- **Recorded Mix Archive**: DJs can record, dump, and publish live sets to a public mix library.
- **Admin Control Center**: User moderation, site statistics, stream management, and role promotion protected by server-side verification.
- **Sleek Minimalist Pro Theme**: Custom dark mode design system with theme presets (`dark`, `neon`, `cyber`), border-less chrome, and responsive mobile layout.

---

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2.4 |
| Styling | Custom CSS Design System + Tailwind CSS | 4.x |
| Auth & Database | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | 0.10.x / 2.x |
| Streaming Server | Icecast | 2.x |
| Containerization | Docker & Docker Compose | v2 |

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                               Clients                                  │
│                                                                        │
│   ┌──────────────┐          ┌──────────────┐     ┌──────────────────┐  │
│   │   Listener   │          │  DJ Browser  │     │ DJ Encoder (OBS) │  │
│   │   Browser    │          │  (Dashboard) │     │ (BUTT / IceS)    │  │
│   └──────┬───────┘          └──────┬───────┘     └────────┬─────────┘  │
└──────────┼─────────────────────────┼──────────────────────┼────────────┘
           │                         │                      │
           ▼                         ▼                      ▼
┌─────────────────────────────────────────┐        ┌──────────────────┐
│              Next.js 16                  │        │    Icecast 2     │
│          (App Router & API)             │◄───────┤ (Audio Server)   │
│                                         │ Webhook│                  │
│ • Server Components & Actions           │ Auth   │ • Source Input   │
│ • Icecast Webhook Auth (/api/icecast/auth)       │ • Stream Output  │
│ • Station Secrets Manager (station-secrets.ts)   │ • MP3 Dump Files │
│ • Middleware Auth Guard                 │        └────────┬─────────┘
└────────────────────┬────────────────────┘                 │
                     │                                      │
                     ▼                                      ▼
┌─────────────────────────────────────────┐        ┌──────────────────┐
│              Supabase                   │        │   recordings/    │
│  (Auth, Postgres DB, Row Level Security)│        │ (MP3 Dump Files) │
└─────────────────────────────────────────┘        └──────────────────┘
```

---

## Repository Structure

```
streamz/
├── app/
│   ├── layout.tsx                # Root layout with Geist font & SEO metadata
│   ├── page.tsx                  # Home page — live streams, hero cards, channel directory
│   ├── globals.css               # Core CSS design system
│   ├── login/page.tsx            # Login interface
│   ├── register/page.tsx         # User & DJ registration
│   ├── dashboard/page.tsx        # DJ control panel — stream & recording management
│   ├── profile/page.tsx          # Profile manager
│   ├── admin/
│   │   ├── page.tsx              # Admin control center (server view)
│   │   └── AdminClient.tsx       # Admin moderation actions
│   ├── stream/[id]/page.tsx      # Stream details, visualizer, & chat shell
│   ├── genre/[name]/page.tsx     # Genre directory filter
│   ├── mixes/page.tsx            # Published mix archive
│   └── api/
│       ├── icecast/
│       │   └── auth/route.ts     # Icecast source authentication webhook
│       └── recordings/
│           ├── route.ts          # GET — list recordings
│           └── [name]/
│               └── route.ts      # DELETE — remove a recording
├── components/
│   ├── Sidebar.tsx               # Left navigation bar
│   ├── Topbar.tsx                # Auth-aware top header
│   ├── GlobalPlayer.tsx          # Docked persistent audio player
│   ├── HomeClient.tsx            # Home view channel & stream grid
│   ├── LiveChat.tsx              # Real-time chat & DJ moderation menu
│   ├── Visualizer.tsx            # WebGL MilkDrop-inspired visualizer component
│   ├── RecordingsManager.tsx     # Recording file list and deletion controls
│   ├── Presence.tsx              # User presence heartbeat component
│   ├── AvatarUpload.tsx          # Cover art and avatar upload component
│   └── visualizer/
│       ├── engine.ts             # WebGL feedback-loop rendering engine
│       └── shaders.ts            # 8 GLSL shader presets
├── context/
│   └── AudioContext.tsx          # Global audio player state & reconnect manager
├── lib/
│   ├── station-secrets.ts        # Station secrets store & Icecast killsource utility
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Async Server Supabase client
├── public/
│   └── theme-pro.css             # Minimalist pro dark theme stylesheet
├── scripts/
│   ├── sync-listeners.js         # Icecast-to-Supabase listener sync daemon
│   └── Dockerfile.sync           # Sync daemon container configuration
├── docker-compose.yml            # Container orchestration
├── docker-entrypoint.sh          # Minimal container entrypoint
├── icecast.xml                   # Icecast server configuration
├── Dockerfile                    # Next.js production build
└── docs/                         # Detailed architecture & API documentation
```

---

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Supabase service role key (bypasses RLS for admin tasks) |
| `STATION_SECRETS_PATH` | Server-only | Path for station passwords file (default: `/config/station-secrets.json`) |
| `ICECAST_CONFIG` | Server-only | Path to Icecast XML configuration (default: `/config/icecast.xml`) |
| `ICECAST_INTERNAL_URL` | Server-only | Internal Icecast admin URL (default: `http://icecast:8000`) |
| `ICECAST_HOST` | Public/Server | Icecast server hostname shown to DJs |
| `ICECAST_PORT` | Public/Server | Icecast server port (default: `8000`) |

---

## Getting Started

### 1. Installation

```bash
git clone <repository-url> streamz
cd streamz
npm install
```

### 2. Environment Setup

Create `.env.local` based on required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Schema Setup

Execute schema initialization in the Supabase SQL Editor:
- `profiles` table (username, full_name, avatar_url, role, is_admin, is_banned)
- `live_streams` table (dj_id, name, mount, genre, is_live, listeners_count, record_stream)
- `chat_bans` and `chat_mods` tables
- `published_mixes` table
- `site_stats` view

### 4. Running the Application

```bash
# Start Icecast + Postgres infrastructure via Docker
docker compose up -d

# Start Next.js development server
npm run dev
```

---

## Available Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack.
- `npm run build`: Compiles production build.
- `npm run start`: Starts production server.
- `npm run lint`: Runs ESLint analysis.

---

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:
- [Architecture](docs/architecture.md): Deep dive into system design and data flows.
- [API Reference](docs/api.md): REST endpoints and server action contracts.
- [Database Schema](docs/database.md): Database tables and RLS security policies.
- [Streaming Guide](docs/streaming.md): Icecast configuration and encoder setup (OBS, BUTT, IceS).
- [Deployment](docs/deployment.md): Docker Compose production setup and reverse proxy guidance.
