import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.baseParticleCount = 500;
        this.baseSize = 0.06;
        
        this.material = new THREE.PointsMaterial({
            color: 0x000000,
            size: this.baseSize,
            transparent: true,
            opacity: 0.8,
            blending: THREE.NormalBlending
        });
    }

    createShadowEmitter(position, sizeLevel = 1) {
        const particleCount = this.baseParticleCount + (sizeLevel - 1) * 50;
        const emitter = {
            points: null,
            positions: new Float32Array(particleCount * 3),
            velocities: new Float32Array(particleCount * 3),
            lifetimes: new Float32Array(particleCount),
            originalPosition: position.clone(),
            lastPosition: position.clone(),
            tilt: 0,
            bob: 0,
            sizeLevel: sizeLevel,
            particleCount: particleCount
        };

        for (let i = 0; i < particleCount; i++) {
            this.resetParticle(emitter, i, true);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(emitter.positions, 3));
        
        const emitterMaterial = this.material.clone();
        const sizeMultiplier = 1 + (sizeLevel - 1) * 0.3;
        emitterMaterial.size = this.baseSize * sizeMultiplier;
        
        emitter.points = new THREE.Points(geo, emitterMaterial);
        this.scene.add(emitter.points);
        
        return emitter;
    }

    updateEmitterSize(emitter, newSizeLevel) {
        emitter.sizeLevel = newSizeLevel;
        emitter.particleCount = this.baseParticleCount + (newSizeLevel - 1) * 50;
        const sizeMultiplier = 1 + (newSizeLevel - 1) * 0.3;
        emitter.points.material.size = this.baseSize * sizeMultiplier;

        emitter.positions = new Float32Array(emitter.particleCount * 3);
        emitter.velocities = new Float32Array(emitter.particleCount * 3);
        emitter.lifetimes = new Float32Array(emitter.particleCount);

        for (let i = 0; i < emitter.particleCount; i++) {
            this.resetParticle(emitter, i, true);
        }

        emitter.points.geometry.dispose();
        const newGeo = new THREE.BufferGeometry();
        newGeo.setAttribute('position', new THREE.BufferAttribute(emitter.positions, 3));
        emitter.points.geometry = newGeo;
    }

    resetParticle(emitter, i, initial = false) {
        const idx = i * 3;
        
        const sizeMultiplier = 1 + (emitter.sizeLevel - 1) * 0.3;
        const h = Math.random() * 1.8 * sizeMultiplier;
        let x = 0, z = 0;

        if (h < 0.5 * sizeMultiplier) {
            const side = Math.random() > 0.5 ? 0.12 : -0.12;
            x = (side + (Math.random() - 0.5) * 0.12) * sizeMultiplier;
            z = ((Math.random() - 0.5) * 0.12) * sizeMultiplier;
        } else if (h > 1.2 * sizeMultiplier && h < 1.5 * sizeMultiplier) {
            x = ((Math.random() - 0.5) * 0.55) * sizeMultiplier;
            z = ((Math.random() - 0.5) * 0.2) * sizeMultiplier;
        } else if (h >= 1.5 * sizeMultiplier) {
            x = ((Math.random() - 0.5) * 0.22) * sizeMultiplier;
            z = ((Math.random() - 0.5) * 0.22) * sizeMultiplier;
        } else {
            x = ((Math.random() - 0.5) * 0.35) * sizeMultiplier;
            z = ((Math.random() - 0.5) * 0.22) * sizeMultiplier;
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

        for (let i = 0; i < emitter.particleCount; i++) {
            const idx = i * 3;
            
            positions[idx] += emitter.velocities[idx];
            positions[idx + 1] += emitter.velocities[idx + 1];
            positions[idx + 2] += emitter.velocities[idx + 2];

            const sizeMultiplier = 1 + (emitter.sizeLevel - 1) * 0.3;
            const hFactor = positions[idx + 1] / (1.8 * sizeMultiplier);
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
        emitter.points.material.dispose();
    }
}
