import * as THREE from 'three';

export class ControlsManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        //> Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        //> Input sate (mobile)
        this.joystick = {
            x: 0,
            y: 0,
            active: false
        };

        //> player pos
        this.position = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        
        //> Camera
        this.phi = 0;
        this.theta = 0;
        this.distance = 5;
        this.height = 1.5;

        //> Player stats
        this.speedLevel = 1;
        this.baseSpeed = 5.0;

        //> if mobile/../../
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        this.init();
    }

    init() {
        //> keyboard contol
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        //> mouse for camera
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        //> touch control
        if (this.isMobile) {
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) {
                mobileControls.classList.remove('hidden');
            }
            this.initMobileControls();
        }
    }

    onKeyDown(e) {
        switch (e.code) {
            case 'KeyW': this.keys.forward = true; break;
            case 'KeyS': this.keys.backward = true; break;
            case 'KeyA': this.keys.left = true; break;
            case 'KeyD': this.keys.right = true; break;
        }
    }

    onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': this.keys.forward = false; break;
            case 'KeyS': this.keys.backward = false; break;
            case 'KeyA': this.keys.left = false; break;
            case 'KeyD': this.keys.right = false; break;
        }
    }

    onMouseMove(e) {
        if (document.pointerLockElement === this.domElement) {
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;

            this.theta -= movementX * 0.002;
            this.phi -= movementY * 0.002;

            this.phi = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.phi));
        }
    }

    initMobileControls() {
        const joystickContainer = document.getElementById('joystick-container');
        const joystickHandle = document.getElementById('joystick-handle');
        const touchCameraArea = document.getElementById('touch-camera-area');

        let joystickTouchId = null;
        let cameraTouchId = null;
        let lastCameraTouch = null;

        //> joystick
        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            joystickTouchId = touch.identifier;
            this.joystick.active = true;
            this.updateJoystick(touch, joystickHandle);
        }, { passive: false });

        joystickContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === joystickTouchId) {
                    this.updateJoystick(touch, joystickHandle);
                }
            }
        }, { passive: false });

        joystickContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === joystickTouchId) {
                    joystickTouchId = null;
                    this.joystick.active = false;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                    joystickHandle.style.transform = 'translate(0, 0)';
                }
            }
        }, { passive: false });

        joystickContainer.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === joystickTouchId) {
                    joystickTouchId = null;
                    this.joystick.active = false;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                    joystickHandle.style.transform = 'translate(0, 0)';
                }
            }
        }, { passive: false });

        //> touch control (camera)
        touchCameraArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            if (cameraTouchId === null && touch.identifier !== joystickTouchId) {
                cameraTouchId = touch.identifier;
                lastCameraTouch = { x: touch.clientX, y: touch.clientY };
            }
        }, { passive: false });

        touchCameraArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === cameraTouchId && lastCameraTouch) {
                    const deltaX = touch.clientX - lastCameraTouch.x;
                    const deltaY = touch.clientY - lastCameraTouch.y;

                    this.theta -= deltaX * 0.005;
                    this.phi -= deltaY * 0.005;
                    this.phi = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.phi));

                    lastCameraTouch = { x: touch.clientX, y: touch.clientY };
                }
            }
        }, { passive: false });

        touchCameraArea.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === cameraTouchId) {
                    cameraTouchId = null;
                    lastCameraTouch = null;
                }
            }
        }, { passive: false });

        touchCameraArea.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (touch.identifier === cameraTouchId) {
                    cameraTouchId = null;
                    lastCameraTouch = null;
                }
            }
        }, { passive: false });
    }

    updateJoystick(touch, handle) {
        const container = document.getElementById('joystick-container');
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;

        const maxDistance = rect.width / 2 - 25;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }

        handle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        this.joystick.x = deltaX / maxDistance;
        this.joystick.y = deltaY / maxDistance;
    }

    update(delta) {
        const speedMultiplier = 1 + (this.speedLevel - 1) * 0.3; // +30% за уровень
        const speed = this.baseSpeed * speedMultiplier * delta;
        const velocity = new THREE.Vector3();

        //> keyboard
        if (this.keys.forward) velocity.z -= speed;
        if (this.keys.backward) velocity.z += speed;
        if (this.keys.left) velocity.x -= speed;
        if (this.keys.right) velocity.x += speed;

        // mobile
        if (this.joystick.active) {
            velocity.x += this.joystick.x * speed;
            velocity.z += this.joystick.y * speed;
        }

        velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.theta);
        
        this.position.add(velocity);

        //> camera update
        const offset = new THREE.Vector3(
            this.distance * Math.sin(this.theta) * Math.cos(this.phi),
            this.distance * Math.sin(this.phi) + this.height,
            this.distance * Math.cos(this.theta) * Math.cos(this.phi)
        );

        this.camera.position.copy(this.position).add(offset);
        this.camera.lookAt(this.position.x, this.position.y + this.height, this.position.z);
    }
}