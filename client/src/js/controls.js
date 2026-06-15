import * as THREE from 'three';

export class ControlsManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        this.joystick = {
            x: 0,
            y: 0,
            active: false
        };

        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        
        this.phi = 0;
        this.theta = 0;
        this.distance = 5;
        this.height = 1.5;

        this.speedLevel = 1;
        this.baseSpeed = 5.0;

        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.init();
    }

    init() {
        this.domElement.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.domElement) {
                this.theta -= e.movementX * 0.002;
                this.phi -= e.movementY * 0.002;
                this.phi = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.phi));
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'arrowup') this.keys.forward = true;
            if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'arrowdown') this.keys.backward = true;
            if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'arrowleft') this.keys.left = true;
            if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'arrowright') this.keys.right = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'arrowup') this.keys.forward = false;
            if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'arrowdown') this.keys.backward = false;
            if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'arrowleft') this.keys.left = false;
            if (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'arrowright') this.keys.right = false;
        });

        if (this.isMobile) {
            this.initMobileControls();
        }
    }

    initMobileControls() {
        const joystick = document.createElement('div');
        joystick.style.position = 'fixed';
        joystick.style.bottom = '20px';
        joystick.style.left = '20px';
        joystick.style.width = '100px';
        joystick.style.height = '100px';
        joystick.style.borderRadius = '50%';
        joystick.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        joystick.style.background = 'rgba(0, 0, 0, 0.3)';
        joystick.style.pointerEvents = 'auto';
        joystick.style.zIndex = '1000';
        document.body.appendChild(joystick);

        let touchId = null;

        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchId = e.changedTouches[0].identifier;
            this.joystick.active = true;
        });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === touchId) {
                    const rect = joystick.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const deltaX = touch.clientX - centerX;
                    const deltaY = touch.clientY - centerY;
                    const maxDistance = rect.width / 2;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    const normalizedDistance = Math.min(distance, maxDistance) / maxDistance;
                    const angle = Math.atan2(deltaY, deltaX);
                    this.joystick.x = Math.cos(angle) * normalizedDistance;
                    this.joystick.y = Math.sin(angle) * normalizedDistance;
                }
            }
        });

        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === touchId) {
                    touchId = null;
                    this.joystick.active = false;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                }
            }
        });
    }

    update(delta) {
        const speedMultiplier = 1 + (this.speedLevel - 1) * 0.2;
        const speed = this.baseSpeed * speedMultiplier * delta;
        const velocity = new THREE.Vector3();

        if (this.keys.forward) velocity.z -= speed;
        if (this.keys.backward) velocity.z += speed;
        if (this.keys.left) velocity.x -= speed;
        if (this.keys.right) velocity.x += speed;

        if (this.joystick.active) {
            velocity.x += this.joystick.x * speed;
            velocity.z += this.joystick.y * speed;
        }

        velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.theta);
        
        this.position.add(velocity);

        this.camera.position.x = this.position.x + Math.sin(this.theta) * this.distance * Math.cos(this.phi);
        this.camera.position.y = this.position.y + this.height + Math.sin(this.phi) * this.distance;
        this.camera.position.z = this.position.z + Math.cos(this.theta) * this.distance * Math.cos(this.phi);
        this.camera.lookAt(this.position.x, this.position.y + this.height, this.position.z);
    }
}
