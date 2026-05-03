# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./

RUN npm ci --only=production

# Copy Prisma files
COPY prisma ./prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]
