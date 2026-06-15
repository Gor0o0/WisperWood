import { io } from 'socket.io-client';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.players = new Map();
    }

    connect(user) {
        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
        const serverUrl = `${protocol}://${host}`;

        console.log('Connecting to multiplayer server:', serverUrl);
        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server, my ID:', this.socket.id);
            this.socket.emit('join', { 
                userId: user.id, 
                username: user.username, 
                ticks: user.ticks, 
                sizeLevel: user.sizeLevel, 
                speedLevel: user.speedLevel 
            });
        });

        this.socket.on('currentPlayers', (players) => {
            console.log('Current players:', players);
            this.syncPlayers(players);
        });

        this.socket.on('playersUpdate', (players) => {
            console.log('Players update:', players);
            this.syncPlayers(players);
        });

        this.socket.on('newPlayer', (playerData) => {
            console.log('New player connected:', playerData);
            this.addRemotePlayer(playerData);
        });

        this.socket.on('playerMoved', (playerData) => {
            if (playerData.id === this.socket.id) {
                return;
            }

            this.updateRemotePlayer(playerData);
        });

        this.socket.on('playerDisconnected', (id) => {
            console.log('Player disconnected:', id);
            this.removeRemotePlayer(id);
        });

        this.socket.on('chatMessage', (data) => {
            this.game.showChatMessage(data.id, data.message);
        });

        this.socket.on('ticksUpdate', (ticks) => {
            this.game.currentUser.ticks = ticks;
            this.game.updateTicks(ticks);
        });

        this.socket.on('upgradeSuccess', (data) => {
            console.log('Upgrade success:', data);
            if (data.type === 'size') {
                this.game.currentUser.sizeLevel = data.newLevel;
                this.game.particleSystem.updateEmitterSize(this.game.localPlayerShadow, data.newLevel);
            } else if (data.type === 'speed') {
                this.game.currentUser.speedLevel = data.newLevel;
                this.game.controlsManager.speedLevel = data.newLevel;
            }
            this.game.currentUser.ticks = data.newTicks;
            this.game.updateTicks(data.newTicks);
            this.game.soundManager.playPop();
        });

        this.socket.on('error', (data) => {
            console.error('Server error:', data.message);
            alert(data.message);
        });
    }

    buyUpgrade(type) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('buyUpgrade', type);
        }
    }

    sendChatMessage(message) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('chatMessage', message);
        }
    }

    addRemotePlayer(data) {
        if (!this.socket || data.id === this.socket.id) {
            return;
        }

        if (this.players.has(data.id)) {
            this.updateRemotePlayer(data);
            return;
        }

        console.log(`New remote player: ${data.name}`);
        this.players.set(data.id, data);
        this.game.addRemotePlayerToScene(data);
    }

    updateRemotePlayer(data) {
        if (!this.socket || data.id === this.socket.id) {
            return;
        }

        const player = this.players.get(data.id);
        if (!player) {
            this.addRemotePlayer(data);
            return;
        }

        player.position = data.position;
        player.rotation = data.rotation;
        this.game.updateRemotePlayerInScene(data);
    }

    removeRemotePlayer(id) {
        console.log(`Remote player left: ${id}`);
        this.players.delete(id);
        this.game.removeRemotePlayerFromScene(id);
    }

    sendUpdate(position, rotation) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('move', { position, rotation });
        }
    }

    syncPlayers(players) {
        if (!this.socket) {
            return;
        }

        const remoteIds = new Set();

        players.forEach((playerData) => {
            if (playerData.id === this.socket.id) {
                this.game.setLocalPlayerServerState(playerData);
                return;
            }

            remoteIds.add(playerData.id);
            this.updateRemotePlayer(playerData);
        });

        Array.from(this.players.keys()).forEach((id) => {
            if (!remoteIds.has(id)) {
                this.removeRemotePlayer(id);
            }
        });

        this.game.updatePlayerCountFromServer(players.length);
    }
}
