FROM node:18

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Create directories
RUN mkdir -p /app/articles /app/public/uploads

# Copy application files
COPY . .

# Set permissions for node user
RUN chown -R node:node /app && \
    chmod -R 755 /app && \
    chmod -R 777 /app/articles /app/public/uploads

# Switch to non-root user
USER node

EXPOSE 3000

CMD ["node", "server.js"]
