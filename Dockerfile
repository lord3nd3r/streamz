FROM node:20-alpine AS base

RUN corepack enable

WORKDIR /app

COPY package.json package-lock.json .npmrc* ./

RUN npm ci --frozen-lockfile

COPY . .

# These are needed at build time for Next.js static page generation.
# They are public (NEXT_PUBLIC_*) so safe to bake into the image.
# Override at runtime via docker-compose environment for different deployments.
ARG NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
