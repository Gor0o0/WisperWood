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
        this.localPlayerName = '';
        
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
            console.warn('Load errm!, use basic models');
        }

        // close load screen & logs
        loadingScreen.classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    }

    initUI() {
        const startBtn = document.getElementById('start-btn');
        const loginScreen = document.getElementById('login-screen');
        const usernameInput = document.getElementById('username-input');
        const chatInput = document.getElementById('chat-input');
        
        const resumeBtn = document.getElementById('resume-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const authorBtn = document.getElementById('author-btn');
        
        const settingsModal = document.getElementById('settings-modal');
        const toggleSoundBtn = document.getElementById('toggle-sound-btn');
        const toggleChatBtn = document.getElementById('toggle-chat-btn');
        const resetSessionBtn = document.getElementById('reset-session-btn');
        const closeSettingsBtn = document.getElementById('close-settings-btn');

        startBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            if (username) {
                this.localPlayerName = username;
                loginScreen.classList.add('hidden');
                document.getElementById('chat-container').classList.remove('hidden');
                document.getElementById('player-counter').classList.remove('hidden');
                this.startGame(username);
            } else {
                alert('Пожалуйста, введите имя');
            }
        });

        usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                startBtn.click();
            }
        });

        resumeBtn.addEventListener('click', () => this.togglePause());
        
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
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isRunning) {
                this.togglePause();
            }
        });
    }

    startGame(username) {
        console.log(`Game started for: ${username}`);
        this.isRunning = true;
        
        this.soundManager.playAmbient();
        this.localPlayerShadow = this.particleSystem.createShadowEmitter(this.controlsManager.position);
        //> player count init
        this.updatePlayerCountFromServer(1);
        this.networkManager.connect(username);
        this.requestPointerLock();
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
            new THREE.Vector3(data.position.x, data.position.y, data.position.z)
        );

        //> starter pos & targetPosition
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
        }
    }

    removeRemotePlayerFromScene(id) {
        const player = this.remotePlayers.get(id);
        if (player) {
            console.log(`Player ${player.name} disconected`);
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
        const isPaused = !pauseMenu.classList.contains('hidden') || !settingsModal.classList.contains('hidden');
        
        this.soundManager.playPop();

        if (isPaused) {
            pauseMenu.classList.add('hidden');
            settingsModal.classList.add('hidden');
            this.requestPointerLock();
        } else {
            pauseMenu.classList.remove('hidden');
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
