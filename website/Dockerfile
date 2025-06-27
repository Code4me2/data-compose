# Multi-stage Dockerfile for Data Compose website
# This builds TypeScript and serves with nginx

# Stage 1: Build TypeScript
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy source files
COPY tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY css ./css
COPY index.development.html ./index.html

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (if we have one)
# COPY nginx.conf /etc/nginx/conf.d/

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy public assets
COPY --from=builder /app/public/* /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]