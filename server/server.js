import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pool, { initDb } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

const players = new Map();
const userSessions = new Map(); // socket.id -> { userId, username, ... }

// Константы для магазина
const SHOP = {
    size: { basePrice: 10, priceMultiplier: 1.5 },
    speed: { basePrice: 10, priceMultiplier: 1.5 }
};

async function getUserById(userId) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
}

async function getUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
}

async function updateUserTicks(userId, ticks) {
    await pool.query('UPDATE users SET ticks = $1 WHERE id = $2', [ticks, userId]);
}

async function buyUpgrade(userId, type) {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    const levelKey = `${type}_level`;
    const currentLevel = user[levelKey];
    const price = Math.floor(SHOP[type].basePrice * Math.pow(SHOP[type].priceMultiplier, currentLevel - 1));

    if (user.ticks < price) throw new Error('Not enough ticks');

    const newTicks = user.ticks - price;
    const newLevel = currentLevel + 1;

    await pool.query(`UPDATE users SET ticks = $1, ${levelKey} = $2 WHERE id = $3`, [newTicks, newLevel, userId]);

    return { newTicks, newLevel, price };
}

// HTTP endpoints для авторизации
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, ticks, size_level, speed_level',
            [username, passwordHash]
        );

        const user = result.rows[0];
        res.json({ 
            success: true, 
            user: { id: user.id, username: user.username, ticks: user.ticks, sizeLevel: user.size_level, speedLevel: user.speed_level }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await getUserByUsername(username);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        res.json({ 
            success: true, 
            user: { id: user.id, username: user.username, ticks: user.ticks, sizeLevel: user.size_level, speedLevel: user.speed_level }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);
    let tickInterval = null;

    socket.on('join', async (userData) => {
            try {
                const { userId, username, ticks, sizeLevel, speedLevel } = userData;

                if (!userId || !username) {
                    socket.emit('error', { message: 'Unauthorized' });
                    return;
                }

                // Save session
                userSessions.set(socket.id, { userId, username, ticks, sizeLevel, speedLevel });

                // Spawn
                const spawnRadius = 5;
                const angle = Math.random() * Math.PI * 2;
                const x = Math.cos(angle) * spawnRadius;
                const z = Math.sin(angle) * spawnRadius;

                players.set(socket.id, {
                    id: socket.id,
                    userId,
                    name: username,
                    position: { x, y: 0, z },
                    rotation: 0,
                    sizeLevel: sizeLevel || 1,
                    speedLevel: speedLevel || 1,
                    ticks
                });

            console.log(`Игрок ${username} подключен, позиция: (${x}, 0, ${z})`);

            // Отправляем текущих игроков
            socket.emit('currentPlayers', Array.from(players.values()));
            io.emit('playersUpdate', Array.from(players.values()));
            socket.broadcast.emit('newPlayer', players.get(socket.id));

            // Начисляем ticks каждые 10 секунд
            tickInterval = setInterval(async () => {
                const session = userSessions.get(socket.id);
                if (session) {
                    session.ticks += 1;
                    await updateUserTicks(session.userId, session.ticks);

                    // Обновляем данные игрока
                    const player = players.get(socket.id);
                    if (player) {
                        player.ticks = session.ticks;
                    }

                    socket.emit('ticksUpdate', session.ticks);
                }
            }, 10000);
        } catch (error) {
            console.error('Join error:', error);
            socket.emit('error', { message: 'Failed to join' });
        }
    });

    socket.on('buyUpgrade', async (type) => {
        try {
            const session = userSessions.get(socket.id);
            if (!session) throw new Error('Not authorized');

            const result = await buyUpgrade(session.userId, type);
            
            session.ticks = result.newTicks;
            session[`${type}Level`] = result.newLevel;

            // Обновляем игрока
            const player = players.get(socket.id);
            if (player) {
                player.ticks = result.newTicks;
                player[`${type}Level`] = result.newLevel;
            }

            socket.emit('upgradeSuccess', { 
                type, 
                newLevel: result.newLevel, 
                newTicks: result.newTicks, 
                price: result.price 
            });
            
            io.emit('playersUpdate', Array.from(players.values()));
        } catch (error) {
            console.error('Buy error:', error);
            socket.emit('error', { message: error.message });
        }
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
        if (tickInterval) clearInterval(tickInterval);
        console.log(`Игрок отключился: ${socket.id}`);
        userSessions.delete(socket.id);
        players.delete(socket.id);
        io.emit('playerDisconnected', socket.id);
        io.emit('playersUpdate', Array.from(players.values()));
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

async function startServer() {
    await initDb();
    server.listen(PORT, () => {
        console.log(`Server started at: ${PORT}`);
    });
}

startServer();
