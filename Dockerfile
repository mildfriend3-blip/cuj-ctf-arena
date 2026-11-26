FROM node:24-slim

WORKDIR /app

# Install backend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install & build React frontend
COPY client/package.json client/package-lock.json ./client/
RUN npm --prefix client ci

COPY . .
RUN npm run build:client

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
