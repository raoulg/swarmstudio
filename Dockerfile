# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

EXPOSE 5173

# Run dev server accessible from outside container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
