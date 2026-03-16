FROM node:current-slim
# ENV HTTP_PROXY=http://172.16.82.3:3128
# ENV HTTPS_PROXY=http://172.16.82.3:3128
WORKDIR /app

RUN apt update -y && apt upgrade -y

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY .env ./.env

RUN npm install
RUN npx prisma generate
COPY prisma ./prisma
COPY public ./public
COPY src ./src

EXPOSE 3000

CMD [ "node", "src/app.js" ]
