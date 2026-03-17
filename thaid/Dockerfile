FROM node:current-slim
# ENV HTTP_PROXY=http://172.16.82.3:3128
# ENV HTTPS_PROXY=http://172.16.82.3:3128
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN apt update -y && apt install -y curl
RUN npm install -g nodemon

RUN npm run build

RUN rm -Rf src

EXPOSE 3000 
CMD ["npm", "start"]
