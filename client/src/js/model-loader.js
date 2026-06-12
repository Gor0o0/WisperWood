import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.models = {};
        this.modelPaths = {
            deadTree: [
                'assets/models/DeadTree_1.gltf',
                'assets/models/DeadTree_2.gltf',
                'assets/models/DeadTree_3.gltf',
                'assets/models/DeadTree_4.gltf',
                'assets/models/DeadTree_5.gltf'
            ],
            pine: [
                'assets/models/Pine_1.gltf',
                'assets/models/Pine_2.gltf',
                'assets/models/Pine_3.gltf',
                'assets/models/Pine_4.gltf',
                'assets/models/Pine_5.gltf'
            ],
            grass: [
                'assets/models/Grass_Common_Short.gltf',
                'assets/models/Grass_Common_Tall.gltf',
                'assets/models/Grass_Wispy_Tall.gltf'
            ],
            rock: [
                'assets/models/Rock_Medium_1.gltf',
                'assets/models/Rock_Medium_2.gltf',
                'assets/models/Rock_Medium_3.gltf'
            ],
            mushroom: 'assets/models/Mushroom_Common.gltf',
            fern: 'assets/models/Fern_1.gltf'
        };
    }

    async loadModel(path) {
        return new Promise((resolve, reject) => {
            this.loader.load(path, (gltf) => {
                const model = gltf.scene;
                this.applyGloomyEffect(model);
                resolve(model);
            }, undefined, reject);
        });
    }

    applyGloomyEffect(object) {
        object.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    if (mat.color) {
                        const gloomyColor = new THREE.Color(0x333333);
                        mat.color.lerp(gloomyColor, 0.4);
                        mat.color.multiplyScalar(0.7);
                    }
                    if (mat.emissive) {
                        mat.emissive.multiplyScalar(0.5);
                    }
                    mat.roughness = Math.max(mat.roughness, 0.8);
                });
            }
        });
    }

    async loadDecorations(onProgress) {
        try {
            const treePrototypes = await Promise.all(this.modelPaths.deadTree.map(path => this.loadModel(path)));
            if (onProgress) onProgress(25);
            
            const pinePrototypes = await Promise.all(this.modelPaths.pine.map(path => this.loadModel(path)));
            if (onProgress) onProgress(50);
            
            const grassPrototypes = await Promise.all(this.modelPaths.grass.map(path => this.loadModel(path)));
            if (onProgress) onProgress(75);
            
            const rockPrototypes = await Promise.all(this.modelPaths.rock.map(path => this.loadModel(path)));
            if (onProgress) onProgress(90);

            //> Dead trees
            for (let i = 0; i < 40; i++) {
                const angle = (i / 40) * Math.PI * 2 + Math.random() * 0.5;
                const radius = 10 + Math.random() * 18;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                
                const proto = treePrototypes[Math.floor(Math.random() * treePrototypes.length)];
                const tree = proto.clone();
                tree.position.set(x, 0, z);
                tree.rotation.y = Math.random() * Math.PI * 2;
                tree.scale.setScalar(0.4 + Math.random() * 0.3);
                this.scene.add(tree);
            }

            //> Trees
            for (let i = 0; i < 25; i++) {
                const angle = (i / 25) * Math.PI * 2 + Math.random() * 0.5;
                const radius = 15 + Math.random() * 20;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                
                const proto = pinePrototypes[Math.floor(Math.random() * pinePrototypes.length)];
                const pine = proto.clone();
                pine.position.set(x, 0, z);
                pine.rotation.y = Math.random() * Math.PI * 2;
                pine.scale.setScalar(0.6 + Math.random() * 0.4);
                this.scene.add(pine);
            }

            //> Rocks
            for (let i = 0; i < 25; i++) {
                const x = (Math.random() - 0.5) * 30;
                const z = (Math.random() - 0.5) * 30;
                
                const proto = rockPrototypes[Math.floor(Math.random() * rockPrototypes.length)];
                const rock = proto.clone();
                rock.position.set(x, 0, z);
                rock.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
                rock.scale.setScalar(0.1 + Math.random() * 0.3);
                this.scene.add(rock);
            }

            //> grass
            for (let i = 0; i < 300; i++) {
                const x = (Math.random() - 0.5) * 35;
                const z = (Math.random() - 0.5) * 35;
                
                const proto = grassPrototypes[Math.floor(Math.random() * grassPrototypes.length)];
                const grass = proto.clone();
                grass.position.set(x, 0, z);
                grass.rotation.y = Math.random() * Math.PI * 2;
                grass.scale.setScalar(0.15 + Math.random() * 0.15);
                this.scene.add(grass);
            }

            console.log("Model loaded");
            if (onProgress) onProgress(100);
        } catch (error) {
            console.error("Load errm!:", error);
            this.loadProceduralDecorations();
            if (onProgress) onProgress(100);
        }
    }

    loadProceduralDecorations() {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            this.createProceduralTree(x, z);
        }

        const grassMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e });
        for (let i = 0; i < 50; i++) {
            const x = (Math.random() - 0.5) * 30;
            const z = (Math.random() - 0.5) * 30;
            const grassGeo = new THREE.ConeGeometry(0.1, 0.5, 4);
            const grass = new THREE.Mesh(grassGeo, grassMat);
            grass.position.set(x, 0.25, z);
            this.scene.add(grass);
        }
    }

    createProceduralTree(x, z) {
        const group = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 3, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.5;
        group.add(trunk);

        const leafMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a2e1a,
            transparent: true,
            opacity: 0.9
        });

        for (let i = 0; i < 3; i++) {
            const leafGeo = new THREE.SphereGeometry(1.2 + Math.random(), 8, 8);
            const leaves = new THREE.Mesh(leafGeo, leafMat);
            leaves.position.y = 3 + i * 1.2;
            leaves.position.x = (Math.random() - 0.5) * 0.5;
            leaves.position.z = (Math.random() - 0.5) * 0.5;
            group.add(leaves);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);
    }
}
