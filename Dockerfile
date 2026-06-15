FROM node:20-alpine

WORKDIR /app

# Копируем package.json файлы
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY scripts/ ./scripts/

# Устанавливаем зависимости корневого проекта
RUN npm install

# Устанавливаем зависимости клиента и сервера
RUN npm run install:all

# Копируем остальной код
COPY . .

# Собираем клиент
RUN npm run build

WORKDIR /app/server

EXPOSE 3000

CMD ["npm", "start"]
