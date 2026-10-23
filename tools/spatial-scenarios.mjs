// Integrated browser seam: visible solid buildings must not close the open service court.
export async function exerciseSpatial() {
  const api = window.__pilotReview;
  await api.ready;
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  // Interior stations from the canonical utility footprints, not obstacle-derived centroids.
  check(!api.canStand(14, -6), 'The eastern utility building is walkable through its interior.');
  check(!api.canStand(-6, 11), 'The western utility building is walkable through its interior.');
  check(api.canStand(3, 5), 'The open service court became an invisible solid enclosure.');
  check(api.player.setView({ x: 3, z: 5, yaw: Math.PI / 4, pitch: 0 }), 'Cannot enter the service court.');
  const eyeHeight = api.camera.position.y - api.sampleHeight(3, 5);
  for (let i = 0; i < 12; i++) {
    check(api.move(-.4, -.4), 'Movement failed across the open service court.');
  }
  const courtyard = api.snapshot();
  check(Math.hypot(courtyard.position[0] + 1.8, courtyard.position[2] - .2) < .05,
    'An invisible obstacle blocks the service-court crossing.');
  check(Math.abs(courtyard.position[1] - courtyard.floor - eyeHeight) < .001,
    'Crossing the service court lost ground contact.');
  api.player.setView({ x: 3, z: 5, yaw: Math.PI / 4, pitch: 0 });
  for (let i = 0; i < 30; i++) api.move(.4, -.4);
  const wallStop = api.snapshot();
  check(wallStop.supported && Math.hypot(wallStop.position[0] - 14, wallStop.position[2] + 6) > 3,
    'Walking penetrated the eastern utility building.');
  // Regression station where a corner-only wall bottom bridged a terrain hollow.
  const wall = api.scene.getObjectByName('PROVISIONAL_spatial-yard-F006-2');
  check(wall?.isMesh, 'The southern storage partition is missing.');
  wall.updateWorldMatrix(true, false);
  const positions = wall.geometry.attributes.position, indices = wall.geometry.index;
  const vertices = [api.camera.position.clone(), api.camera.position.clone(), api.camera.position.clone()];
  const x = 58.63, z = 52.44;
  let bottom = Infinity;
  for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
    for (let j = 0; j < 3; j++) {
      vertices[j].fromBufferAttribute(positions, indices ? indices.getX(i + j) : i + j).applyMatrix4(wall.matrixWorld);
    }
    const [a, b, c] = vertices;
    const determinant = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    if (Math.abs(determinant) < 1e-8) continue;
    const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / determinant;
    const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / determinant;
    if (Math.min(u, v, 1 - u - v) >= -1e-5) {
      bottom = Math.min(bottom, u * a.y + v * b.y + (1 - u - v) * c.y);
    }
  }
  const wallGroundGap = bottom - api.sampleHeight(x, z);
  check(Number.isFinite(wallGroundGap) && wallGroundGap <= .025,
    `The southern storage wall floats ${wallGroundGap.toFixed(3)} m above supported ground.`);
  api.reset();
  return { courtyard: courtyard.position, utilityWallStop: wallStop.position, wallGroundGap };
}
