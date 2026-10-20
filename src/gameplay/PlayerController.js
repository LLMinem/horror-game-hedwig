// First-person review movement. PilotWorld owns ground and collision rules.
import * as THREE from 'three';

export function createPlayerController({ camera, renderer, flashlight, constants, navigation = null, enabled = true }) {
  let yaw = 0, pitch = 0;
  let mouseSensitivity = 0.002, walkSpeed = 3.5;
  let isPointerLocked = false;
  let inspection = false;
  let forwardVelocity = 0, strafeVelocity = 0;
  const keys = { forward: false, backward: false, left: false, right: false, sprint: false };
  const keyMap = { w: 'forward', arrowup: 'forward', s: 'backward', arrowdown: 'backward', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', shift: 'sprint' };
  const velocity = new THREE.Vector3();
  const lookDirection = new THREE.Vector3();
  const groundLimit = constants.GROUND_SIZE * 0.45;

  function clearInput() {
    for (const key in keys) keys[key] = false;
    forwardVelocity = strafeVelocity = 0;
    velocity.set(0, 0, 0);
  }

  function orient() {
    lookDirection.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(camera.position.x + lookDirection.x, camera.position.y + lookDirection.y, camera.position.z + lookDirection.z);
  }

  renderer.domElement.addEventListener('click', () => {
    if (enabled && !isPointerLocked) {
      const request = renderer.domElement.requestPointerLock();
      request?.catch(error => console.warn('Mouse capture unavailable:', error));
    }
  });
  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    if (!isPointerLocked) clearInput();
  });
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
  document.addEventListener('mousemove', event => {
    if (!enabled || !isPointerLocked) return;
    yaw += (event.movementX || 0) * mouseSensitivity;
    pitch -= (event.movementY || 0) * mouseSensitivity;
    pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
  });
  window.addEventListener('keydown', event => {
    if (!enabled || !isPointerLocked) return;
    const key = event.key.toLowerCase();
    if (keyMap[key]) { keys[keyMap[key]] = true; event.preventDefault(); }
    if (key === 'f' && !event.repeat) flashlight.visible = !flashlight.visible;
  });
  window.addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    if (keyMap[key]) keys[keyMap[key]] = false;
  });

  function setView(view) {
    if (!view || ![view.x, view.z, view.yaw, view.pitch].every(Number.isFinite)) return false;
    if (view.inspection) {
      if (!Number.isFinite(view.y)) return false;
      camera.position.set(view.x, view.y, view.z);
    } else {
      if (navigation && (!navigation.isReady || !navigation.canStand(view.x, view.z))) return false;
      const floor = navigation ? navigation.sampleHeight(view.x, view.z) : 0;
      if (floor === null) return false;
      camera.position.set(view.x, floor + constants.CAMERA_HEIGHT, view.z);
    }
    inspection = !!view.inspection;
    yaw = view.yaw;
    pitch = view.pitch;
    clearInput();
    orient();
    return true;
  }

  function reset() {
    return setView(navigation ? navigation.spawn : { x: 0, z: constants.CAMERA_START_Z, yaw: 0, pitch: 0 });
  }

  function update(deltaTime) {
    const dt = Math.max(0, Math.min(deltaTime, 0.1));
    orient();
    if (enabled && isPointerLocked && !inspection && (!navigation || navigation.isReady)) {
      const forward = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
      const strafe = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const speed = walkSpeed * (forward < 0 ? 0.5 : keys.sprint && forward > 0 ? 1.5 : 1);
      forwardVelocity = THREE.MathUtils.lerp(forwardVelocity, forward * speed, 1 - Math.exp(-8 * dt));
      strafeVelocity = strafe * walkSpeed;
      velocity.set(Math.sin(yaw) * forwardVelocity + Math.cos(yaw) * strafeVelocity, 0,
        -Math.cos(yaw) * forwardVelocity + Math.sin(yaw) * strafeVelocity);
      if (navigation) {
        if (velocity.lengthSq() > 1e-8 && navigation.move(camera.position, velocity.x * dt, velocity.z * dt)) {
          camera.position.y += constants.CAMERA_HEIGHT;
        }
      } else {
        camera.position.x = THREE.MathUtils.clamp(camera.position.x + velocity.x * dt, -groundLimit, groundLimit);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z + velocity.z * dt, -groundLimit, groundLimit);
        camera.position.y = constants.CAMERA_HEIGHT;
      }
    }
    if (flashlight.visible) {
      flashlight.position.copy(camera.position);
      flashlight.target.position.copy(camera.position).addScaledVector(lookDirection, 10);
    }
  }

  return {
    update, reset, setView, clearInput,
    setEnabled(value) { enabled = !!value; clearInput(); },
    setSensitivity(value) { mouseSensitivity = value; },
    setWalkSpeed(value) { walkSpeed = value; },
    getVelocity: () => velocity.clone(),
    getSpeed: () => Math.hypot(forwardVelocity, strafeVelocity),
    isMoving: () => Math.abs(forwardVelocity) > 0.01 || Math.abs(strafeVelocity) > 0.01,
    isSprinting: () => keys.sprint,
    getPosition: () => camera.position.clone(),
    setPosition: position => setView({ x: position.x, z: position.z, yaw, pitch }),
    get enabled() { return enabled; },
    get inspection() { return inspection; },
    get pointerLocked() { return isPointerLocked; },
    get yaw() { return yaw; },
    get pitch() { return pitch; },
  };
}
