FROM node:20-alpine as base

RUN corepack enable

WORKDIR /app

COPY package.json package-lock.json .npmrc* ./

RUN npm ci --frozen-lockfile

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
