# Deployment Guide

## Development

```bash
# Install dependencies
npm install

# Start infrastructure (Icecast + Postgres)
docker compose up -d

# Start the Next.js dev server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## Production with Docker Compose

### 1. Create a `.env` file

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Icecast
ICECAST_SOURCE_PASSWORD=strong-source-password
ICECAST_ADMIN_PASSWORD=strong-admin-password
ICECAST_ADMIN_USERNAME=admin

# Postgres
POSTGRES_PASSWORD=strong-db-password
POSTGRES_USER=postgres
```

### 2. Build and run

```bash
docker compose up -d --build
```

### 3. Verify

```bash
# Check all services are running
docker compose ps

# Check Next.js logs
docker compose logs nextjs

# Check Icecast logs
docker compose logs icecast
```

---

## Production with Standalone Build

For deployments without Docker (e.g., VPS, bare metal):

### 1. Build

```bash
npm run build
```

### 2. Start

```bash
npm run start
```

The production server runs on port `3000`.

> **Note:** You'll need to run Icecast and Postgres separately in this configuration.

---

## Reverse Proxy (Nginx)

For production, put Nginx in front of both Next.js and Icecast:

```nginx
# /etc/nginx/sites-available/streamz
server {
    listen 80;
    server_name streamz.example.com;

    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name streamz.example.com;

    ssl_certificate     /etc/letsencrypt/live/streamz.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/streamz.example.com/privkey.pem;

    # Next.js app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Icecast streams
    location /live/ {
        proxy_pass http://127.0.0.1:8000/live/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;  # Important for streaming!
        proxy_read_timeout 86400;
    }

    # Icecast admin (optional, restrict access)
    location /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host $host;
        allow 10.0.0.0/8;    # Adjust to your admin IP range
        deny all;
    }
}
```

Key points:
- **`proxy_buffering off`** is critical for Icecast — without it, Nginx will buffer audio and break streaming
- **`proxy_read_timeout 86400`** prevents Nginx from closing long-lived audio connections
- Restrict `/admin/` to trusted IPs

---

## Environment Variables Reference

### Required

| Variable | Used In | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase admin key (never exposed to client) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `ICECAST_SOURCE_PASSWORD` | `changeme` | Password for DJ source connections |
| `ICECAST_ADMIN_PASSWORD` | `changeme` | Icecast admin panel password |
| `ICECAST_ADMIN_USERNAME` | `admin` | Icecast admin panel username |
| `POSTGRES_PASSWORD` | `postgres` | Postgres database password |
| `POSTGRES_USER` | `postgres` | Postgres database user |
| `ICECAST_HOST` | `localhost` | Displayed in the dashboard streaming config |
| `ICECAST_PORT` | `8000` | Displayed in the dashboard streaming config |

---

## Volumes & Persistence

| Docker Volume | Host Path | Purpose |
|--------------|-----------|---------|
| `postgres_data` | Docker managed | Postgres database files |
| `./recordings` | `./recordings/` | Icecast MP3 dump files |
| `./icecast.xml` | `/etc/icecast.xml` | Icecast configuration |

> **Backup:** To back up recordings, simply copy the `recordings/` directory. For the database, use `pg_dump` or Supabase's built-in backup features.

---

## Health Checks

| Service | Check | Expected |
|---------|-------|----------|
| Next.js | `curl http://localhost:3000` | HTML response |
| Icecast | `curl http://localhost:8000/status-json.xsl` | JSON with server stats |
| Postgres | `docker compose exec postgres pg_isready` | `accepting connections` |

---

## Security Checklist

- [ ] Change all default passwords (`changeme`, `postgres`)
- [ ] Use HTTPS in production (Let's Encrypt / Cloudflare)
- [ ] Set `NODE_ENV=production` in the Next.js container
- [ ] Restrict Icecast admin panel to trusted IPs
- [ ] Ensure `.env*` files are in `.gitignore` (they are by default)
- [ ] Enable RLS policies in Supabase (see [database.md](database.md))
- [ ] Review Supabase service role key usage — it bypasses RLS
