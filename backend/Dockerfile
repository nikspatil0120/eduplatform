# Use Node.js 20 LTS
FROM node:20.18.0-alpine

# Set working directory
WORKDIR /app

# Copy backend package files first for better caching
COPY backend/package*.json ./

# Install dependencies (no build step)
RUN npm ci --only=production --ignore-scripts

# Copy backend source code
COPY backend/src/ ./src/
COPY backend/start-production.js ./
COPY backend/railway-start.js ./
COPY backend/debug-startup.js ./
COPY backend/verify-startup.js ./
COPY backend/create-admin-users.js ./
COPY backend/seed-data.js ./

# Note: Environment variables will be provided by Railway
# No need to copy .env file

# Create necessary directories
RUN mkdir -p logs uploads

# Set proper permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "railway-start.js"]