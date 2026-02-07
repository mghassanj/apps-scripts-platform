FROM node:22-alpine

WORKDIR /app

# Install clasp CLI globally for script management
RUN npm i -g @google/clasp

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]

EXPOSE 3000
