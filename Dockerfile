FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY src/ src/
RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
# stdio by default; set MTG_ORACLE_TRANSPORT=http to serve on port 3000. The data
# directory is meant to be a volume, so the card database survives restarts.
ENV MTG_ORACLE_DATA_DIR=/data \
    MTG_ORACLE_HOST=0.0.0.0 \
    MTG_ORACLE_PORT=3000
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
ENTRYPOINT ["node", "dist/server.js"]
