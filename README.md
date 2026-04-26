# Streamz

**Live DJ streaming platform** built with Next.js 16, Supabase, and Icecast — styled after [DI.FM](https://di.fm).

DJs register, create stream mounts, and broadcast live audio through Icecast. Listeners browse live streams grouped by electronic music genres in a rich, art-heavy interface with horizontal-scrolling card rows, a fixed sidebar, a sticky top bar, and a global persistent audio player featuring a 7-mode audio visualizer. Recordings are automatically captured and managed through the dashboard.

---

## Design

The UI is inspired by **DI.FM** (Digitally Imported) — a premium electronic music streaming platform:

- **Deep navy palette** — `#0d1527` background, `#162040` card surfaces, `#3b7bf5` blue accent
- **Fixed left sidebar** — navigation for Home, Dashboard, Profile
- **Sticky top bar** — auth state aware (Login/Sign Up or user email)
- **Horizontal-scrolling card rows** — featured hero cards (wide) and channel tiles (square)
- **Art-heavy stream cards** — full-bleed artwork with gradient overlays, live badges, hover scale, and quick 'Direct MP3' copy links
- **Persistent Global Player** — audio continues playing while navigating the site
- **Audio Visualizer** — Milkdrop-inspired canvas visualizer with 7 trippy modes (Vortex, Kaleidoscope, Tunnel, Pulse, Wave, Nebula, Prism)
- **Genre Categorization** — Live streams are dynamically grouped into sections based on the DJ's configured genre
- **Built-in SEO** — Automatically generated `sitemap.xml`, `robots.txt`, and rich OpenGraph/Twitter metadata for optimal search indexing
- **Branded auth pages** — centered cards with gradient logo, styled inputs, uppercase labels
- **Responsive** — sidebar collapses on mobile

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser    │────▶│    Nginx     │────▶│  Next.js 16  │────▶│    Supabase      │
│  (Listener)  │◀────│ (HTTPS/Proxy)│◀────│  (App Router)│◀────│  (Auth + DB)     │
└─────────────┘     └──────┬───────┘     └──────┬───────┘     └─────────────────┘
                           │                    │
┌─────────────┐     ┌──────┴───────┐     ┌──────┴───────┐     ┌─────────────────┐
│  OBS / Mixxx│────▶│   Icecast    │◀────│ Sync Service │     │   recordings/    │
│  (DJ Source) │     │  (Port 8000) │     │  (Loop Sync) │     │   (MP3 dumps)    │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────────────┘
```

| Component | Purpose |
|-----------|---------|
| **Next.js 16** | Frontend + API routes + server actions (Turbopack) |
| **Supabase** | Authentication, Postgres database, and RLS policies |
| **Icecast** | Audio streaming server (Ogg/MP3) |
| **Nginx** | SSL termination (Certbot) and secure audio proxying |
| **Sync Service** | Real-time background sync between Icecast and DB |
| **Docker Compose** | Orchestrates Next.js, Icecast, Postgres, and Sync |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS 4 + custom CSS design system | 4.x |
| Auth & DB | Supabase (`@supabase/ssr`) | 0.10.x |
| Streaming | Icecast | 2.x |
| Containerization | Docker Compose | v2 |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Docker** & **Docker Compose** (for Icecast + Postgres)
- A **Supabase** project (cloud or self-hosted)

### 1. Clone & Install

```bash
git clone <repo-url> streamz
cd streamz
npm install
```

### 2. Configure Environment

Copy the example and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | ✅ |
| `ICECAST_HOST` | Icecast server hostname (shown in dashboard) | Optional |
| `ICECAST_PORT` | Icecast server port (shown in dashboard) | Optional |

### 3. Set Up the Database

Run the SQL migrations in your Supabase project. See [docs/database.md](docs/database.md) for the full schema.

### 4. Start Services

```bash
# Start Icecast + Postgres
docker compose up -d

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Docker Passwords

Override default Icecast/Postgres passwords via environment variables or a `.env` file:

```bash
ICECAST_SOURCE_PASSWORD=your_source_pw
ICECAST_ADMIN_PASSWORD=your_admin_pw
POSTGRES_PASSWORD=your_db_pw
```

---

## Project Structure

```
streamz/
├── app/
│   ├── layout.tsx              # Root layout (Geist fonts) + Global SEO Metadata
│   ├── page.tsx                # Home — featured, live, channels
│   ├── globals.css             # DI.FM-style design system
│   ├── sitemap.ts              # Automated sitemap.xml generator
│   ├── robots.ts               # Automated robots.txt generator
│   ├── login/page.tsx          # Login (client component)
│   ├── register/page.tsx       # Registration (client component)
│   ├── dashboard/page.tsx      # DJ dashboard (server actions to create, update, delete streams)
│   ├── profile/page.tsx        # User profile (server component)
│   └── api/
│       └── recordings/
│           ├── route.ts        # GET — list recordings
│           └── [name]/
│               └── route.ts    # DELETE — remove a recording
├── components/
│   ├── Sidebar.tsx             # Fixed left navigation sidebar
│   ├── Topbar.tsx              # Sticky top bar (auth-aware)
│   ├── RecordingsManager.tsx   # Client component for recordings
│   ├── GlobalPlayer.tsx        # Persistent audio player fixed to the bottom
│   ├── HomeClient.tsx          # Homepage client view with genre grouping
│   └── Visualizer.tsx          # 7-mode HTML5 Canvas audio visualizer
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       └── server.ts           # Server Supabase client (async)
├── public/
│   └── art/                    # Generated channel artwork
│       ├── 1.png               # Purple/blue neon cityscape
│       ├── 2.png               # Orange/magenta turntable
│       ├── 3.png               # Teal bioluminescent
│       └── 4.png               # Green matrix vinyl
├── types/
│   └── supabase.ts             # Database types
├── middleware.ts                # Auth guard (session refresh)
├── docker-compose.yml          # Icecast + Postgres + Next.js
├── icecast.xml                 # Icecast server configuration
├── Dockerfile                  # Production build
├── recordings/                 # Icecast dump files (MP3s)
└── docs/                       # Documentation
    ├── architecture.md         # System design & data flow
    ├── database.md             # Schema, tables, RLS policies
    ├── api.md                  # API route reference
    ├── streaming.md            # Icecast setup & DJ guide
    └── deployment.md           # Production deployment guide
```

---

## Pages & Routes

| Route | Type | Auth | Description |
|-------|------|------|-------------|
| `/` | Server | No | Home — featured hero cards, live streams, popular channels |
| `/login` | Client | No | Branded login card with gradient logo |
| `/register` | Client | No | Registration with DJ Name field |
| `/dashboard` | Server | Yes | DJ control panel — streams, recordings, config |
| `/profile` | Server | Yes | User profile viewer |
| `/api/recordings` | API | Yes | `GET` — list MP3 recordings |
| `/api/recordings/[name]` | API | Yes | `DELETE` — remove a recording |

---

## Authentication Flow

1. **Middleware** (`middleware.ts`) runs on every non-API/static request
2. Creates a Supabase client using `getAll`/`setAll` cookie pattern
3. Calls `supabase.auth.getUser()` to validate the session
4. Redirects:
   - `/dashboard/*` → `/login` if not authenticated
   - `/login` → `/dashboard` if already authenticated
5. Server components use `await createClient()` (async `cookies()` in Next.js 16)
6. Client components use `createClient()` from `@supabase/ssr` browser client

---

## Development

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

---

## Documentation

Detailed guides are in the [`docs/`](docs/) folder:

| Document | Contents |
|----------|----------|
| [Architecture](docs/architecture.md) | System design, component diagram, data flow |
| [Database](docs/database.md) | Supabase schema, tables, types, RLS policies |
| [API Reference](docs/api.md) | REST endpoints, request/response formats |
| [Streaming Guide](docs/streaming.md) | Icecast config, OBS/IceS setup, mount points |
| [Deployment](docs/deployment.md) | Docker production, env vars, reverse proxy |

---

## License

Private project.
