import { io } from 'socket.io-client';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
    }

    connect(userData) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        
        let serverUrl = `${protocol}//${host}${port ? `:${port}` : ''}`;
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            serverUrl = 'http://localhost:3000';
        }

        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('join', userData);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('playersUpdate', (players) => {
            this.game.updatePlayerCountFromServer(players.length);
            players.forEach(player => {
                if (player.id !== this.socket.id) {
                    this.game.addRemotePlayerToScene(player);
                    this.game.updateRemotePlayerInScene(player);
                }
            });
        });

        this.socket.on('playerJoined', (player) => {
            if (player.id !== this.socket.id) {
                this.game.addRemotePlayerToScene(player);
            }
        });

        this.socket.on('playerLeft', (id) => {
            this.game.removeRemotePlayerFromScene(id);
        });

        this.socket.on('playerMoved', (data) => {
            if (data.id !== this.socket.id) {
                this.game.updateRemotePlayerInScene(data);
            }
        });

        this.socket.on('chatMessage', (data) => {
            this.game.showChatMessage(data.id, data.message);
        });

        this.socket.on('ticksUpdate', (ticks) => {
            this.game.updateTicks(ticks);
        });

        this.socket.on('upgradeSuccess', (data) => {
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

    sendUpdate(position, rotation) {
        if (this.socket) {
            this.socket.emit('move', {
                position: {
                    x: position.x,
                    y: position.y,
                    z: position.z
                },
                rotation: rotation
            });
        }
    }

    sendChatMessage(message) {
        if (this.socket) {
            this.socket.emit('chatMessage', message);
        }
    }

    buyUpgrade(type) {
        if (this.socket) {
            this.socket.emit('buyUpgrade', type);
        }
    }
}
