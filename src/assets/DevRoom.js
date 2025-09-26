// DevRoom.js - Minimal asset sandbox
// ==================================
// Spawns a neutral testing area for curated assets. Right now it places the
// street lamp hero prop at world origin so we can study lighting and scale
// before building the full cemetery layout.

import * as THREE from 'three';
import { loadStreetLampInstance } from './Assets.js';

/**
 * Create the Dev Room container and start loading the lamp asset.
 * Returns control helpers plus a promise that resolves when the lamp is ready.
 */
export function createDevRoom({ scene, world }) {
  const root = new THREE.Group();
  root.name = 'DevRoomRoot';
  scene.add(root);

  const state = {
    lamp: null,
  };

  const ready = (async () => {
    try {
      const { scene: lampScene } = await loadStreetLampInstance();
      lampScene.name = 'DevRoom_StreetLamp';

      // Ensure the prop participates in lighting.
      lampScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Drop it at the origin on the ground plane by default.
      lampScene.position.set(0, 0, 0);
      root.add(lampScene);
      state.lamp = lampScene;

      // Hide the old placeholder meshes so the scene only shows curated props.
      if (world && typeof world.setTestObjectsVisible === 'function') {
        world.setTestObjectsVisible(false);
      }

      return lampScene;
    } catch (error) {
      console.error('Failed to load Dev Room lamp:', error);
      throw error;
    }
  })();

  return {
    root,
    ready,
    getLamp: () => state.lamp,
    setVisible: (visible) => { root.visible = visible; },
    dispose: () => {
      root.clear();
      scene.remove(root);
      state.lamp = null;
    },
  };
}

export default createDevRoom;
