// Assets.js - Centralized asset loading helpers
// =============================================
// Provides shared GLTF/Draco/KTX2 loaders so every part of the game
// can load 3D assets without re-creating loaders or duplicating downloads.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Internal loader singletons
let loadingManager = null;
let dracoLoader = null;
let gltfLoader = null;
let ktx2Loader = null;
let initialized = false;
let ktx2SupportDetected = false;

// Cache GLTF promises so repeated loads reuse the same download.
const gltfCache = new Map();

// Resolve paths relative to Vite's base URL so assets work in dev and prod builds.
const resolvePublicAsset = (assetPath) => {
  const trimmed = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${import.meta.env.BASE_URL}${trimmed}`;
};

/**
 * Initialize loaders once we have access to the renderer.
 * KTX2 needs the renderer to detect GPU compression support.
 */
export function initAssetSystem({ renderer } = {}) {
  if (initialized) {
    // Still update KTX2 detection if we get a renderer for the first time.
    if (renderer && ktx2Loader && !ktx2SupportDetected) {
      ktx2Loader.detectSupport(renderer);
      ktx2SupportDetected = true;
    }
    return;
  }

  loadingManager = new THREE.LoadingManager();

  dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderConfig({ type: 'js' });
  dracoLoader.setDecoderPath(resolvePublicAsset('libs/draco/'));

  gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.setDRACOLoader(dracoLoader);

  ktx2Loader = new KTX2Loader(loadingManager);
  ktx2Loader.setTranscoderPath(resolvePublicAsset('libs/basis/'));
  if (renderer) {
    ktx2Loader.detectSupport(renderer);
    ktx2SupportDetected = true;
  }
  gltfLoader.setKTX2Loader(ktx2Loader);

  initialized = true;
}

/**
 * Load a GLTF once and cache the promise.
 */
async function loadGltf(assetPath) {
  if (!gltfLoader) {
    throw new Error('initAssetSystem() must be called before loading assets.');
  }

  const resolved = resolvePublicAsset(assetPath);
  if (!gltfCache.has(resolved)) {
    const promise = new Promise((resolve, reject) => {
      gltfLoader.load(
        resolved,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });
    gltfCache.set(resolved, promise);
  }
  return gltfCache.get(resolved);
}

/**
 * Clone a GLTF scene so multiple instances can coexist while sharing
 * geometry/material data under the hood.
 */
function cloneGltfScene(gltf) {
  const clonedScene = clone(gltf.scene);
  return {
    scene: clonedScene,
    animations: gltf.animations,
    original: gltf,
  };
}

const STREET_LAMP_PATH = 'assets/models/props/SM_StreetLamp_Simple.glb';

/**
 * Load the street lamp hero asset and return a fresh scene instance.
 */
export async function loadStreetLampInstance() {
  const gltf = await loadGltf(STREET_LAMP_PATH);
  const instance = cloneGltfScene(gltf);
  instance.scene.name = 'SM_StreetLamp_Simple_Instance';
  return instance;
}

export const Assets = {
  init: initAssetSystem,
  loadStreetLampInstance,
};

export default Assets;
