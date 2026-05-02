# Base image
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json .npmrc* ./
RUN npm ci --frozen-lockfile

# Copy source and build args for NEXT_PUBLIC_*
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Build Next.js (standalone output enabled in next.config.ts)
RUN npm run build

# Production image - copy only what's needed
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output (much smaller, no full node_modules)
COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
