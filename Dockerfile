FROM node:18

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Create directories and set proper permissions
RUN mkdir -p /app/articles /app/public/uploads && \
    chown -R node:node /app

# Copy articles first to ensure they exist
COPY articles/*.json /app/articles/

# Copy remaining application files
COPY . .

# Ensure all files are owned by node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 3000

CMD ["node", "server.js"]
