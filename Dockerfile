FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN cd client ; npm install ; cd ../server ; npm install

COPY . .

RUN cd client ; npm run build

WORKDIR /app/server

EXPOSE 3000

CMD ["npm", "start"]
