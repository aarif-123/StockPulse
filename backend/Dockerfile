FROM node:18-slim AS builder

WORKDIR /usr/src/app

# Install OpenSSL for Prisma generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /usr/src/app

# Install OpenSSL and CA Certificates for Prisma runtime and database connection
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
