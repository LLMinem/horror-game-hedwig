// DevRoom.js - Minimal asset sandbox
// ==================================
// Spawns a neutral testing area for curated assets. Right now it places the
// street lamp hero prop at world origin so we can study lighting and scale
// before building the full cemetery layout.

import * as THREE from 'three';
const { PointLight, Box3, Vector3 } = THREE;
import { loadStreetLampInstance } from './Assets.js';

const bounds = new Box3();
const center = new Vector3();

/**
 * Create the Dev Room container and start loading the lamp asset.
 * Returns control helpers plus a promise that resolves when the lamp is ready.
 */
export function createDevRoom({ scene, world, environment }) {
  const root = new THREE.Group();
  root.name = 'DevRoomRoot';
  scene.add(root);

  const lampLight = new PointLight(0xfff2c0, 35, 22, 2.2);
  lampLight.name = 'DevRoom_LampLight';
  lampLight.visible = false; // toggled via GUI
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(512, 512);
  lampLight.shadow.bias = -0.0005;
  lampLight.shadow.normalBias = 0.015;
  root.add(lampLight);

  const state = {
    lamp: null,
    lampLight,
  };

  const positionLampLight = () => {
    if (!state.lamp) return;
    bounds.setFromObject(state.lamp);
    bounds.getCenter(center);
    const top = bounds.max.y;
    lampLight.position.set(center.x, top - 0.2, center.z);
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

      if (environment && typeof environment.registerAsset === 'function') {
        environment.registerAsset(lampScene);
      }

      positionLampLight();

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
    getLampLight: () => state.lampLight,
    refreshLampLightPosition: positionLampLight,
    setLampLight: ({ enabled, intensity, distance, decay, color }) => {
      if (enabled !== undefined) {
        lampLight.visible = enabled;
      }
      if (intensity !== undefined) {
        lampLight.intensity = intensity;
      }
      if (distance !== undefined) {
        lampLight.distance = distance;
      }
      if (decay !== undefined) {
        lampLight.decay = decay;
      }
      if (color) {
        lampLight.color.set(color);
      }
      positionLampLight();
    },
    setVisible: (visible) => { root.visible = visible; },
    dispose: () => {
      root.clear();
      scene.remove(root);
      state.lamp = null;
    },
  };
}

export default createDevRoom;
