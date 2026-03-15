FROM node:22-slim

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built output
COPY dist/ dist/

# Glama inspection requires the server to be runnable via stdio
ENTRYPOINT ["node", "dist/server.js"]
