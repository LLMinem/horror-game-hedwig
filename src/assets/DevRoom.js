// DevRoom.js - Minimal asset sandbox
// ==================================
// Spawns a neutral testing area for curated assets. Right now it places the
// street lamp hero prop at world origin so we can study lighting and scale
// before building the full cemetery layout.

import * as THREE from 'three';
import { DEFAULTS } from '../config/Constants.js';
const { PointLight, PointLightHelper, Box3, Vector3 } = THREE;
import { loadStreetLampInstance } from './Assets.js';

const bounds = new Box3();
const center = new Vector3();
const DEFAULT_LAMP_LIGHT_OFFSET = 0.25; // Keep bulb tucked inside lantern
const MIN_EMISSIVE_INTENSITY = 0.1; // Matches Blender's "lamp off" baseline
const DEFAULT_LIGHT_INTENSITY = DEFAULTS.devRoomLampLightIntensity; // 35
const DEFAULT_EMISSIVE_INTENSITY = 1.5; // Lamp glass glow for "on"

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
    lampLightHelper: null,
    lampLightOffset: DEFAULT_LAMP_LIGHT_OFFSET,
    lampMaterials: [],
    targetEmissiveIntensity: computeEmissiveFromLight(DEFAULT_LIGHT_INTENSITY),
  };

  function computeEmissiveFromLight(lightIntensity) {
    if (DEFAULT_LIGHT_INTENSITY <= 0) {
      return MIN_EMISSIVE_INTENSITY;
    }

    const safeIntensity = Math.max(0, lightIntensity);
    const ratio = safeIntensity / DEFAULT_LIGHT_INTENSITY;
    const emissive = MIN_EMISSIVE_INTENSITY + (DEFAULT_EMISSIVE_INTENSITY - MIN_EMISSIVE_INTENSITY) * ratio;
    return Math.max(MIN_EMISSIVE_INTENSITY, emissive);
  }

  function applyEmissiveToMaterials(intensity) {
    state.targetEmissiveIntensity = intensity;
    if (!state.lampMaterials.length) {
      return;
    }

    state.lampMaterials.forEach((material) => {
      if ('emissiveIntensity' in material) {
        material.emissiveIntensity = intensity;
      }
    });
  }

  function updateLampEmissiveFromLight(lightIntensity, isVisible) {
    const baseIntensity = isVisible ? lightIntensity : 0;
    const emissive = computeEmissiveFromLight(baseIntensity);
    applyEmissiveToMaterials(emissive);
  }

  const positionLampLight = () => {
    if (!state.lamp) return;
    bounds.setFromObject(state.lamp);
    bounds.getCenter(center);
    const top = bounds.max.y;
    lampLight.position.set(center.x, top - state.lampLightOffset, center.z);
    if (state.lampLightHelper) {
      state.lampLightHelper.update();
    }
  };

  const ready = (async () => {
    try {
      const { scene: lampScene } = await loadStreetLampInstance();
      lampScene.name = 'DevRoom_StreetLamp';

      const lampMaterials = new Set();

      // Ensure the prop participates in lighting.
      lampScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              if (mat && typeof mat === 'object' && 'emissiveIntensity' in mat) {
                lampMaterials.add(mat);
              }
            });
          }
        }
      });

      state.lampMaterials = Array.from(lampMaterials);

      // Drop it at the origin on the ground plane by default.
      lampScene.position.set(0, 0, 0);
      root.add(lampScene);
      state.lamp = lampScene;

      if (environment && typeof environment.registerAsset === 'function') {
        environment.registerAsset(lampScene);
      }

      applyEmissiveToMaterials(state.targetEmissiveIntensity);

      positionLampLight();

      state.lampLightHelper = new PointLightHelper(lampLight, 0.4, 0xfff2c0);
      state.lampLightHelper.visible = false;
      root.add(state.lampLightHelper);

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
    setLampLight: ({ enabled, intensity, distance, decay, color, heightOffset }) => {
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
      if (heightOffset !== undefined) {
        state.lampLightOffset = heightOffset;
      }
      positionLampLight();
      updateLampEmissiveFromLight(lampLight.intensity, lampLight.visible);
    },
    setLampEmissiveIntensity: (intensity) => {
      applyEmissiveToMaterials(Math.max(MIN_EMISSIVE_INTENSITY, intensity));
    },
    setLampEmissiveFromLight: (lightIntensity, isVisible = lampLight.visible) => {
      updateLampEmissiveFromLight(lightIntensity, isVisible);
    },
    setLampLightHelperVisible: (visible) => {
      if (state.lampLightHelper) {
        state.lampLightHelper.visible = !!visible;
      }
    },
    setVisible: (visible) => { root.visible = visible; },
    dispose: () => {
      if (state.lampLightHelper) {
        root.remove(state.lampLightHelper);
        state.lampLightHelper.dispose?.();
        state.lampLightHelper = null;
      }
      root.clear();
      scene.remove(root);
      state.lamp = null;
      state.lampMaterials = [];
    },
  };
}

export default createDevRoom;
