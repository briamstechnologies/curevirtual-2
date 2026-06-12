# # Use a Debian-based image instead of Alpine for better OpenSSL compatibility
# FROM node:22-slim

# # Install system dependencies
# RUN apt-get update -y && apt-get install -y openssl ca-certificates

# WORKDIR /app

# # Install dependencies first for better caching
# COPY package*.json ./
# RUN npm install

# # Copy source code and Prisma schema
# COPY . .

# # Generate Prisma Client
# RUN npx prisma generate

# ENV NODE_ENV=production
# # Default port if not provided by Railway
# ENV PORT=5001
# EXPOSE 5001

# # Start the application
# CMD ["npm", "start"]


FROM node:22-slim

# Install system dependencies
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

# 1. Root dependencies install karein
COPY package*.json ./
RUN npm install

# 2. Backend dependencies install karein
COPY web/backend/package*.json ./web/backend/
RUN cd web/backend && npm install

# 3. Poora project copy karein
COPY . .

# 4. Prisma generate ka path fix karein (Sabse important)
# Agar aapka schema file 'web/backend/prisma/schema.prisma' mein hai:
RUN cd web/backend && npx prisma generate

ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001

# 5. Start command
# Ensure karein ki server.js sahi folder mein call ho raha hai
CMD ["node", "web/backend/server.js"]