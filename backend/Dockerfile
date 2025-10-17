# Use Node.js 20 LTS
FROM node:20.18.0-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (no build step)
RUN npm ci --only=production --ignore-scripts

# Copy backend source code
COPY src/ ./src/
COPY start-production.js ./
COPY railway-start.js ./
COPY debug-startup.js ./
COPY verify-startup.js ./
COPY create-admin-users.js ./
COPY seed-data.js ./

# Copy environment files (but not .env.example)
COPY .env ./

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