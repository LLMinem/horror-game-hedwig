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
  api.reset();
  return { courtyard: courtyard.position, utilityWallStop: wallStop.position };
}
