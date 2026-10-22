import * as THREE from 'three';
import { loadPilot, loadPilotVegetation } from '../assets/Assets.js';
import { createPilotMovement } from './PilotMovement.js';

export function createPilotWorld({ scene, environment }) {
  const root = new THREE.Group();
  root.name = 'CemeteryReviewCandidate';
  let status = 'loading';
  let error = null;
  let data = null;
  let movement = null;

  async function addVegetation(groups) {
    if (!groups?.some(group => group.positions.length)) return;
    const gltf = await loadPilotVegetation();
    gltf.scene.updateMatrixWorld(true);
    const placement = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    for (const group of groups) {
      if (!group.positions.length) continue;
      const prototype = gltf.scene.getObjectByName(group.prototype);
      if (!prototype) throw new Error(`Missing vegetation prototype: ${group.prototype}`);
      let meshCount = 0;
      prototype.traverse(mesh => {
        if (!mesh.isMesh) return;
        meshCount++;
        const instances = new THREE.InstancedMesh(mesh.geometry, mesh.material, group.positions.length);
        instances.name = `${group.prototype}/${mesh.name}`;
        instances.castShadow = true;
        instances.receiveShadow = true;
        for (let i = 0; i < group.positions.length; i++) {
          const values = group.positions[i];
          if (values.length !== 5 || !values.every(Number.isFinite) || values[3] <= 0) throw new Error(`Invalid vegetation placement: ${group.prototype}`);
          placement.position.set(values[0], values[1], values[2]);
          placement.scale.setScalar(values[3]);
          placement.rotation.set(0, values[4], 0);
          placement.updateMatrix();
          matrix.multiplyMatrices(placement.matrix, mesh.matrixWorld);
          instances.setMatrixAt(i, matrix);
        }
        instances.instanceMatrix.needsUpdate = true;
        instances.computeBoundingSphere();
        root.add(instances);
      });
      if (!meshCount) throw new Error(`Vegetation prototype has no meshes: ${group.prototype}`);
    }
  }

  const ready = (async () => {
    try {
      const loaded = await loadPilot();
      data = loaded.data;
      movement = createPilotMovement(data);
      loaded.scene.traverse(object => {
        if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      });
      root.add(loaded.scene);
      await addVegetation(data.vegetation);
      environment.registerAsset(root);
      scene.add(root);
      status = 'ready';
      return data;
    } catch (cause) {
      status = 'error';
      error = cause instanceof Error ? cause : new Error(String(cause));
      throw error;
    }
  })();

  return {
    root, ready,
    get status() { return status; },
    get error() { return error; },
    get isReady() { return status === 'ready'; },
    get data() { return data; },
    get spawn() { return data?.spawn; },
    get views() { return data?.views ?? []; },
    sampleHeight: (x, z) => movement?.sampleHeight(x, z) ?? null,
    canStand: (x, z, radius) => status === 'ready' && movement.canStand(x, z, radius),
    move: (position, dx, dz) => status === 'ready' && movement.move(position, dx, dz),
  };
}
