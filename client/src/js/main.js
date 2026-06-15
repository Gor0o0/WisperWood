import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { SceneManager } from './three-scene.js';
import { ControlsManager } from './controls.js';
import { NetworkManager } from './websocket.js';
import { ParticleSystem } from './particles.js';
import { SoundManager } from './sound-manager.js';
import { ModelLoader } from './model-loader.js';

class Game {
    constructor() {
        this.sceneManager = new SceneManager();
        this.controlsManager = new ControlsManager(this.sceneManager.camera, this.sceneManager.renderer.domElement);
        this.networkManager = new NetworkManager(this);
        this.particleSystem = new ParticleSystem(this.sceneManager.scene);
        this.soundManager = new SoundManager();
        this.modelLoader = new ModelLoader(this.sceneManager.scene);
        this.isRunning = false;
        this.clock = new THREE.Clock();
        
        this.localPlayerShadow = null;
        this.remotePlayers = new Map(); // id -> { shadow, nameLabel }
        this.currentUser = null;
        
        this.startLoading();
        this.initUI();
        this.animate();
    }

    updatePlayerCount() {
        const counter = document.getElementById('player-count');
        if (counter) {
            counter.textContent = this.remotePlayers.size + 1;
        }
    }

    updatePlayerCountFromServer(count) {
        const counter = document.getElementById('player-count');
        if (counter) {
            counter.textContent = count;
        }
    }

    updateTicks(ticks) {
        const ticksEl = document.getElementById('ticks-count');
        if (ticksEl) {
            ticksEl.textContent = ticks;
        }
        this.updateShopPrices();
    }

    updateShopPrices() {
        const sizePriceEl = document.getElementById('size-price');
        const speedPriceEl = document.getElementById('speed-price');
        const sizeLevelEl = document.getElementById('size-level');
        const speedLevelEl = document.getElementById('speed-level');
        const buySizeBtn = document.getElementById('buy-size-btn');
        const buySpeedBtn = document.getElementById('buy-speed-btn');

        if (!this.currentUser) return;

        const basePrice = 10;
        const sizePrice = Math.floor(basePrice * Math.pow(1.5, this.currentUser.sizeLevel - 1));
        const speedPrice = Math.floor(basePrice * Math.pow(1.5, this.currentUser.speedLevel - 1));

        if (sizePriceEl) sizePriceEl.textContent = sizePrice;
        if (speedPriceEl) speedPriceEl.textContent = speedPrice;
        if (sizeLevelEl) sizeLevelEl.textContent = this.currentUser.sizeLevel;
        if (speedLevelEl) speedLevelEl.textContent = this.currentUser.speedLevel;

        if (buySizeBtn) buySizeBtn.disabled = this.currentUser.ticks < sizePrice;
        if (buySpeedBtn) buySpeedBtn.disabled = this.currentUser.ticks < speedPrice;
    }

    async startLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const progressBar = document.getElementById('progress-bar');
        const skipBtn = document.getElementById('skip-loading-btn');
        
        let progress = 0;
        const onProgress = (p) => {
            progress = p;
            progressBar.style.width = `${progress}%`;
        };

        //> flor
        this.sceneManager.createFloor();

        //> models
        try {
            await this.modelLoader.loadDecorations(onProgress);
        } catch (e) {
            console.warn('Load errrm!, use basic models');
        }

        // close load screen & show auth
        loadingScreen.classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    }

    showAuthError(message) {
        const errorEl = document.getElementById('auth-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(() => {
                errorEl.classList.add('hidden');
            }, 3000);
        }
    }

    async handleAuth(action) {
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;

        if (!username || !password) {
            this.showAuthError('Please enter username and password');
            return;
        }

        try {
            const response = await fetch(`/api/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                this.showAuthError(data.error || 'Something went wrong');
                return;
            }

            this.currentUser = data.user;
            this.startGame();
        } catch (error) {
            console.error('Auth error:', error);
            this.showAuthError('Connection error');
        }
    }

    initUI() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const authUsername = document.getElementById('auth-username');
        const authPassword = document.getElementById('auth-password');

        loginBtn.addEventListener('click', () => this.handleAuth('login'));
        registerBtn.addEventListener('click', () => this.handleAuth('register'));

        [authUsername, authPassword].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleAuth('login');
                }
            });
        });

        const resumeBtn = document.getElementById('resume-btn');
        const shopBtn = document.getElementById('shop-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const authorBtn = document.getElementById('author-btn');
        const closeShopBtn = document.getElementById('close-shop-btn');
        const buySizeBtn = document.getElementById('buy-size-btn');
        const buySpeedBtn = document.getElementById('buy-speed-btn');

        const settingsModal = document.getElementById('settings-modal');
        const shopModal = document.getElementById('shop-modal');
        const toggleSoundBtn = document.getElementById('toggle-sound-btn');
        const toggleChatBtn = document.getElementById('toggle-chat-btn');
        const resetSessionBtn = document.getElementById('reset-session-btn');
        const closeSettingsBtn = document.getElementById('close-settings-btn');

        const chatInput = document.getElementById('chat-input');

        resumeBtn.addEventListener('click', () => this.togglePause());
        
        shopBtn.addEventListener('click', () => {
            document.getElementById('pause-menu').classList.add('hidden');
            shopModal.classList.remove('hidden');
            this.updateShopPrices();
        });

        closeShopBtn.addEventListener('click', () => {
            shopModal.classList.add('hidden');
            document.getElementById('pause-menu').classList.remove('hidden');
        });

        buySizeBtn.addEventListener('click', () => {
            this.networkManager.buyUpgrade('size');
        });

        buySpeedBtn.addEventListener('click', () => {
            this.networkManager.buyUpgrade('speed');
        });

        settingsBtn.addEventListener('click', () => {
            document.getElementById('pause-menu').classList.add('hidden');
            settingsModal.classList.remove('hidden');
        });

        authorBtn.addEventListener('click', () => {
            window.open('https://github.com/Gor0o0', '_blank');
        });

        toggleSoundBtn.addEventListener('click', () => {
            const isMuted = this.soundManager.toggleMute();
            toggleSoundBtn.textContent = isMuted ? 'Off' : 'On';
        });

        toggleChatBtn.addEventListener('click', () => {
            const labels = document.querySelectorAll('.chat-bubble');
            const isHidden = toggleChatBtn.textContent === 'Hide';
            
            labels.forEach(label => {
                label.style.display = isHidden ? 'block' : 'none';
            });
            
            toggleChatBtn.textContent = isHidden ? 'Show' : 'Hide';
        });

        resetSessionBtn.addEventListener('click', () => {
            if (confirm('Are you sure?')) {
                location.reload();
            }
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            document.getElementById('pause-menu').classList.remove('hidden');
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const message = chatInput.value.trim();
                if (message) {
                    this.networkManager.sendChatMessage(message);
                    chatInput.value = '';
                    chatInput.blur();
                    this.requestPointerLock();
                }
            }
            if (e.key === 'Escape') {
                chatInput.blur();
                this.requestPointerLock();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isRunning) {
                this.togglePause();
            }
            if (e.key === 'Shift' && this.isRunning) {
                const isLocked = document.pointerLockElement === this.sceneManager.renderer.domElement;
                if (isLocked) {
                    document.exitPointerLock();
                } else {
                    const pauseMenu = document.getElementById('pause-menu');
                    const settingsModal = document.getElementById('settings-modal');
                    const shopModal = document.getElementById('shop-modal');
                    const isPaused = !pauseMenu.classList.contains('hidden') || !settingsModal.classList.contains('hidden') || !shopModal.classList.contains('hidden');
                    if (!isPaused) {
                        this.requestPointerLock();
                    }
                }
            }
            if (e.key === '/' && this.isRunning) {
                e.preventDefault();
                const pauseMenu = document.getElementById('pause-menu');
                const settingsModal = document.getElementById('settings-modal');
                const shopModal = document.getElementById('shop-modal');
                const isPaused = !pauseMenu.classList.contains('hidden') || !settingsModal.classList.contains('hidden') || !shopModal.classList.contains('hidden');
                if (!isPaused) {
                    document.exitPointerLock();
                    setTimeout(() => {
                        chatInput.focus();
                        chatInput.value = '';
                    }, 100);
                }
            }
        });
    }

    startGame() {
        if (!this.currentUser) return;

        console.log(`Game started for: ${this.currentUser.username}`);
        this.isRunning = true;
        
        // Hide auth, show game UI
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('chat-container').classList.remove('hidden');
        document.getElementById('player-counter').classList.remove('hidden');
        document.getElementById('ticks-panel').classList.remove('hidden');
        document.getElementById('controls-hint').classList.remove('hidden');

        // Apply initial player stats
        this.controlsManager.speedLevel = this.currentUser.speedLevel;

        this.updateTicks(this.currentUser.ticks);
        this.soundManager.playAmbient();
        this.localPlayerShadow = this.particleSystem.createShadowEmitter(this.controlsManager.position, this.currentUser.sizeLevel);
        //> player count init
        this.updatePlayerCountFromServer(1);
        this.networkManager.connect(this.currentUser);
        this.requestPointerLock();

        // Listen for pointer lock changes
        document.addEventListener('pointerlockchange', () => {
            const isLocked = document.pointerLockElement === this.sceneManager.renderer.domElement;
            // If game is running but paused, don't do anything
        }, false);
    }

    setLocalPlayerServerState(data) {
        if (!data || !data.position) {
            return;
        }

        const position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
        this.controlsManager.position.copy(position);

        if (typeof data.rotation === 'number') {
            this.controlsManager.theta = data.rotation;
        }

        if (this.localPlayerShadow) {
            this.localPlayerShadow.points.position.copy(position);
            this.localPlayerShadow.lastPosition.copy(position);
            this.localPlayerShadow.originalPosition.copy(position);
        }
    }

    showChatMessage(id, message) {
        console.log(`Player ${id} whisper: ${message}`);
        this.soundManager.playWhisper();
        
        let targetMesh = null;
        if (id === this.networkManager.socket.id) {
            if (this.localPlayerShadow) {
                targetMesh = this.localPlayerShadow.points;
            }
        } else {
            const player = this.remotePlayers.get(id);
            if (player) {
                targetMesh = player.shadow.points;
            }
        }

        if (targetMesh) {
            this.createChatBubble(targetMesh, message);
        }
    }

    createChatBubble(mesh, message) {
        if (mesh.userData.chatBubble) {
            mesh.remove(mesh.userData.chatBubble);
        }

        const div = document.createElement('div');
        div.className = 'chat-bubble';
        div.textContent = message;

        const label = new CSS2DObject(div);
        label.position.set(0, 2.5, 0);
        mesh.add(label);
        mesh.userData.chatBubble = label;

        setTimeout(() => {
            if (mesh.userData.chatBubble === label) {
                mesh.remove(label);
                mesh.userData.chatBubble = null;
            }
        }, 3000);
    }

    addRemotePlayerToScene(data) {
        if (this.remotePlayers.has(data.id)) {
            this.updateRemotePlayerInScene(data);
            return;
        }

        console.log(`addRemotePlayerToScene: add player ${data.name}, pos:`, data.position);
        const shadowEmitter = this.particleSystem.createShadowEmitter(
            new THREE.Vector3(data.position.x, data.position.y, data.position.z),
            data.sizeLevel || 1
        );

        //> starter pos & target position
        shadowEmitter.points.position.set(data.position.x, data.position.y, data.position.z);
        shadowEmitter.targetPosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);

        //> username label
        const nameDiv = document.createElement('div');
        nameDiv.style.color = 'white';
        nameDiv.style.fontSize = '12px';
        nameDiv.style.textShadow = '1px 1px 2px black';
        nameDiv.style.pointerEvents = 'none';
        nameDiv.textContent = data.name;
        const nameLabel = new CSS2DObject(nameDiv);
        nameLabel.position.set(0, 2, 0);
        shadowEmitter.points.add(nameLabel);

        this.remotePlayers.set(data.id, { 
            shadow: shadowEmitter, 
            name: data.name,
            nameLabel: nameLabel
        });

        console.log(`Player ${data.name} added to remotePlayers, total:`, this.remotePlayers.size);
        this.updatePlayerCount();
    }

    updateRemotePlayerInScene(data) {
        const player = this.remotePlayers.get(data.id);
        if (player) {
            player.shadow.targetPosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
            // Update size level if changed
            if (data.sizeLevel && data.sizeLevel !== player.shadow.sizeLevel) {
                this.particleSystem.updateEmitterSize(player.shadow, data.sizeLevel);
            }
        }
    }

    removeRemotePlayerFromScene(id) {
        const player = this.remotePlayers.get(id);
        if (player) {
            console.log(`Player ${player.name} disconnected`);
            this.particleSystem.remove(player.shadow);
            this.remotePlayers.delete(id);
            this.updatePlayerCount();
        }
    }

    requestPointerLock() {
        const canvas = this.sceneManager.renderer.domElement;
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        // for mobile don't ask pointer lock
        if (!this.controlsManager.isMobile) {
            canvas.requestPointerLock();
        }
    }

    togglePause() {
        const pauseMenu = document.getElementById('pause-menu');
        const settingsModal = document.getElementById('settings-modal');
        const shopModal = document.getElementById('shop-modal');
        const isPaused = !pauseMenu.classList.contains('hidden') || !settingsModal.classList.contains('hidden') || !shopModal.classList.contains('hidden');
        
        this.soundManager.playPop();

        if (isPaused) {
            // Resume
            pauseMenu.classList.add('hidden');
            settingsModal.classList.add('hidden');
            shopModal.classList.add('hidden');
            // Don't auto-lock on resume, just keep it unlocked
        } else {
            // Pause
            pauseMenu.classList.remove('hidden');
            settingsModal.classList.add('hidden');
            shopModal.classList.add('hidden');
            if (document.exitPointerLock) {
                document.exitPointerLock();
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();

        if (this.isRunning) {
            this.controlsManager.update(delta);
            this.networkManager.sendUpdate(this.controlsManager.position, this.controlsManager.theta);
            
            const isMoving = this.controlsManager.keys.forward || this.controlsManager.keys.backward || 
                             this.controlsManager.keys.left || this.controlsManager.keys.right ||
                             (this.controlsManager.joystick.active && (this.controlsManager.joystick.x !== 0 || this.controlsManager.joystick.y !== 0));
            
            const moveDir = new THREE.Vector3();
            if (isMoving) {
                moveDir.set(0, 0, 0);
                if (this.controlsManager.keys.forward || this.controlsManager.joystick.y < 0) moveDir.z -= 1;
                if (this.controlsManager.keys.backward || this.controlsManager.joystick.y > 0) moveDir.z += 1;
                if (this.controlsManager.keys.left || this.controlsManager.joystick.x < 0) moveDir.x -= 1;
                if (this.controlsManager.keys.right || this.controlsManager.joystick.x > 0) moveDir.x += 1;
                moveDir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.controlsManager.theta);
            }

            if (this.localPlayerShadow) {
                this.particleSystem.update(this.localPlayerShadow, this.controlsManager.position, delta, isMoving, moveDir);
            }

            this.remotePlayers.forEach((player) => {
                if (player.shadow.targetPosition) {
                    const lastPos = player.shadow.points.position.clone();
                    player.shadow.points.position.lerp(player.shadow.targetPosition, 0.1);
                    
                    const remoteIsMoving = lastPos.distanceTo(player.shadow.targetPosition) > 0.01;
                    const remoteMoveDir = player.shadow.targetPosition.clone().sub(lastPos).normalize();
                    
                    this.particleSystem.update(player.shadow, player.shadow.points.position, delta, remoteIsMoving, remoteMoveDir);
                }
            });
        }
        
        this.sceneManager.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
