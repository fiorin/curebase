FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate

EXPOSE 3001
CMD ["npm", "run", "docker:start"]
