import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particleCount = 500;
        
        this.material = new THREE.PointsMaterial({
            color: 0x000000,
            size: 0.06,
            transparent: true,
            opacity: 0.8,
            blending: THREE.NormalBlending
        });
    }

    createShadowEmitter(position) {
        const emitter = {
            points: null,
            positions: new Float32Array(this.particleCount * 3),
            velocities: new Float32Array(this.particleCount * 3),
            lifetimes: new Float32Array(this.particleCount),
            originalPosition: position.clone(),
            lastPosition: position.clone(),
            tilt: 0,
            bob: 0
        };

        for (let i = 0; i < this.particleCount; i++) {
            this.resetParticle(emitter, i, true);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(emitter.positions, 3));
        
        emitter.points = new THREE.Points(geo, this.material);
        this.scene.add(emitter.points);
        
        return emitter;
    }

    resetParticle(emitter, i, initial = false) {
        const idx = i * 3;
        
        const h = Math.random() * 1.8;
        let x = 0, z = 0;

        if (h < 0.5) {
            const side = Math.random() > 0.5 ? 0.12 : -0.12;
            x = side + (Math.random() - 0.5) * 0.12;
            z = (Math.random() - 0.5) * 0.12;
        } else if (h > 1.2 && h < 1.5) {
            x = (Math.random() - 0.5) * 0.55;
            z = (Math.random() - 0.5) * 0.2;
        } else if (h >= 1.5) {
            x = (Math.random() - 0.5) * 0.22;
            z = (Math.random() - 0.5) * 0.22;
        } else {
            x = (Math.random() - 0.5) * 0.35;
            z = (Math.random() - 0.5) * 0.22;
        }

        emitter.positions[idx] = x;
        emitter.positions[idx + 1] = h;
        emitter.positions[idx + 2] = z;

        emitter.velocities[idx] = (Math.random() - 0.5) * 0.008;
        emitter.velocities[idx + 1] = (Math.random() - 0.5) * 0.005;
        emitter.velocities[idx + 2] = (Math.random() - 0.5) * 0.008;

        emitter.lifetimes[i] = Math.random() * 2.0 + 1.0;
    }

    update(emitter, currentPosition, delta, isMoving = false, moveDir = new THREE.Vector3()) {
        const positions = emitter.points.geometry.attributes.position.array;
        
        emitter.bob += delta * 2;
        const bobOffset = Math.sin(emitter.bob) * 0.1;
        
        const targetTilt = isMoving ? 0.2 : 0;
        emitter.tilt += (targetTilt - emitter.tilt) * 0.1;

        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 3;
            
            positions[idx] += emitter.velocities[idx];
            positions[idx + 1] += emitter.velocities[idx + 1];
            positions[idx + 2] += emitter.velocities[idx + 2];

            const hFactor = positions[idx + 1] / 1.8;
            if (isMoving) {
                positions[idx] -= moveDir.x * emitter.tilt * hFactor;
                positions[idx + 2] -= moveDir.z * emitter.tilt * hFactor;
            }

            emitter.lifetimes[i] -= delta;

            if (emitter.lifetimes[i] <= 0) {
                this.resetParticle(emitter, i);
            }
        }

        emitter.points.material.opacity = 0.6 + Math.random() * 0.2;
        
        const finalPos = currentPosition.clone();
        finalPos.y += bobOffset;
        
        emitter.points.position.copy(finalPos);
        emitter.points.geometry.attributes.position.needsUpdate = true;
        emitter.lastPosition.copy(currentPosition);
    }

    remove(emitter) {
        this.scene.remove(emitter.points);
        emitter.points.geometry.dispose();
    }
}
