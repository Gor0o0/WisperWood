import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

const players = new Map();

io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on('join', (userData) => {
        //> спавн радиус
        const spawnRadius = 5;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * spawnRadius;
        const z = Math.sin(angle) * spawnRadius;
        
        players.set(socket.id, {
            id: socket.id,
            name: userData.name,
            position: { x: x, y: 0, z: z },
            rotation: 0
        });

        console.log(`Игрок ${userData.name} подключен, позиция: (${x}, 0, ${z})`);

        //> Отправка текущих игроков новому клиенту
        socket.emit('currentPlayers', Array.from(players.values()));

        //> Оповещение всех об обновленном списке
        io.emit('playersUpdate', Array.from(players.values()));
        socket.broadcast.emit('newPlayer', players.get(socket.id));
    });

    socket.on('move', (moveData) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = moveData.position;
            player.rotation = moveData.rotation;
            socket.broadcast.emit('playerMoved', player);
        }
    });

    socket.on('chatMessage', (message) => {
        io.emit('chatMessage', { id: socket.id, message: message });
    });

    socket.on('disconnect', () => {
        console.log(`Игрок отключился: ${socket.id}`);
        players.delete(socket.id);
        io.emit('playerDisconnected', socket.id);

        io.emit('playersUpdate', Array.from(players.values()));
    });
});

server.listen(PORT, () => {
    console.log(`Server started at: ${PORT}`);
});
