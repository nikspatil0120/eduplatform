# Use Node.js 20 LTS
FROM node:20.18.0-alpine

# Set working directory
WORKDIR /app

# Copy package files first (from backend directory)
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy all backend files
COPY backend/ ./

# Remove unnecessary files to keep image clean
RUN rm -f .env.example .env.railway nixpacks.toml railway.json .nvmrc .railway .dockerignore Dockerfile

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