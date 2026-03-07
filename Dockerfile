FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY .env ./.env

RUN npm install
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

CMD [ "node", "src/app.js" ]
