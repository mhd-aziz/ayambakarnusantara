# === Fase build: kompilasi Vite (mode prod) ke build/ ===
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# URL API di-bake saat build (env menang atas .env.prod placeholder).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build   # vite build --mode prod -> outDir build/

# === Fase runtime: static SPA server (tanpa nginx) ===
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000

# Hanya hasil build + server; tidak ikut node_modules/devDeps.
COPY --from=build /app/build ./build
COPY serve.js ./serve.js

EXPOSE 3000
USER node

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "serve.js"]