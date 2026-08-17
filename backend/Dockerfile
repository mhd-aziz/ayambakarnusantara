# Ayam Bakar Nusantara — Backend (Express 5 + Supabase)
# Runtime non-root; secret dipasok via docker-compose env_file (TIDAK di-Copy ke image).
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install dependency produksi saja
COPY package*.json ./
RUN npm ci --omit=dev

# Hanya source runtime (docs/supabase/scripts tidak dibutuhkan di image)
COPY src ./src

EXPOSE 5000

# Sistem TIDAK set passwordless sudo ke shell container; USER node untuk menghindari root.
USER node

# Health probe memakai route root ("/") yang sudah ada di app.js.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/ || exit 1

CMD ["node", "src/index.js"]