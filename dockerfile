
# cms-api/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3005

# Health check removed - we'll disable in Coolify instead
# HEALTHCHECK ...

CMD ["node", "server.js"]
