# WhisperWood

мини игра для банального общения между собой в жуткой атмосфере туманного леса

## Технологии
- **Client**: Vite, Three.js, Howler.js, socket.io-client
- **Server**: Node.js, Express, socket.io, PostgreSQL
- **Deployment**: Render.com, Docker

## Новые функции
- Аутентификация (регистрация/вход)
- Система Ticks (пассивная валюта, начисляется каждые 10 секунд)
- Магазин улучшений:
  - +Size (увеличивает размер игрока)
  - +Speed (увеличивает скорость)
- Сохранение прогресса в PostgreSQL

## Предварительные требования
- Node.js 18+
- PostgreSQL

## Локальная разработка

### 1. Установка зависимостей
В корне проекта:
```bash
npm install
```

### 2. Настройка базы данных
Создайте файл `.env` в папке `server/` и добавьте:
```
DATABASE_URL=postgresql://user:password@localhost:5432/whisperwood
PORT=3000
```

Или создайте `.env` в корне проекта - сервер его тоже подхватит.

### 3. Установка зависимостей клиента и сервера
```bash
npm run install:all
```

### 4. Сборка клиента
```bash
npm run build
```

### 5. Запуск сервера
```bash
npm start
```

Сервер запустится на http://localhost:3000

### 6. Разработка (отдельно клиент и сервер)
```bash
# Запуск сервера с hot reload
npm run dev:server

# В другом терминале - запуск клиента с hot reload
npm run dev:client
```

## Деплой на Render.com

### 1. Подготовка репозитория
- Убедись, что все файлы закоммичены и загружены на GitHub

### 2. Создание сервиса на Render.com
- Перейдите на [Render.com](https://render.com) и авторизуйтесь
- Нажмите **New +** → **Web Service**
- Подключите ваш GitHub репозиторий
- В настройках:
  - **Name**: любое имя (например, `whisperwood`)
  - **Region**: выберите ближайшую
  - **Branch**: основная ветка (main/master)
  - **Runtime**: выберите **Docker**
  - Остальные настройки можно оставить по умолчанию
- Нажмите **Create Web Service**

### 3. Добавление базы данных PostgreSQL
- На Render.com нажмите **New +** → **PostgreSQL**
- Создайте бесплатную базу данных
- После создания скопируйте **Internal Database URL**
- Вернитесь в настройки веб-сервиса → **Environment** → **Add Environment Variable**
- Добавьте переменную:
  - **Key**: `DATABASE_URL`
  - **Value**: скопированный Internal Database URL

### 4. Готово!
Render автоматически соберет и развернет приложение. Когда процесс завершится, вы получите ссылку на игру.

## Структура проекта
- `/client` - Фронтенд на Three.js
- `/server` - Бэкенд на Node.js
- `/scripts` - Вспомогательные скрипты
- `Dockerfile` - Конфигурация Docker для деплоя
