// Runs in the actual browser through the existing CDP harness. No source-text assertions.
export async function exercisePilot() {
  const api = window.__pilotReview;
  await api.ready;
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const eyeHeight = api.camera.position.y - api.sampleHeight(api.camera.position.x, api.camera.position.z);
  check(api.snapshot().status === 'ready', 'Pilot must finish loading');
  api.setLighting('neutral');
  check(api.scene.fog === null, 'Neutral comparison must not hide geometry with fog');
  const route = [[-29,-65],[-27.7,-62.9],[-11.7,-35.9],[-11,-31.7],[-13.8,-26.9],[-16.2,-25.1],
    [-22.2,-20.7],[-25.1,-18.6],[-27.4,-15.3],[-27.3,-11.5],[-26.5,-9.3],[-20.3,1.2],[-17.9,4.8],
    [-14.5,2.9],[-10.9,.55],[-1.1,-5.7],[4.1,-8.8],[13,-14.4],[.9,-34.1],[-3.7,-31.3],[-11,-31.7]];
  api.reset();
  let minFloor = Infinity, maxFloor = -Infinity;
  const timings = [], calls = []; let previous = await frame();
  for (const [x,z] of route) {
    let iterations = 0;
    while (Math.hypot(api.camera.position.x-x, api.camera.position.z-z) > .08) {
      const dx=x-api.camera.position.x,dz=z-api.camera.position.z,remaining=Math.hypot(dx,dz);
      const step=Math.min(.35,remaining);
      api.player.setView({x:api.camera.position.x,z:api.camera.position.z,yaw:Math.atan2(dx,-dz),pitch:0});
      check(api.move(dx/remaining*step,dz/remaining*step),`Route movement failed at ${x}, ${z}`);
      const state=api.snapshot();
      check(state.supported && Math.abs(state.position[1]-state.floor-eyeHeight)<.001,'Route lost ground contact');
      minFloor=Math.min(minFloor,state.floor);maxFloor=Math.max(maxFloor,state.floor);
      const now=await frame();timings.push(now-previous);previous=now;calls.push(api.renderer.info.render.calls);
      check(++iterations<200,`Route blocked before ${x}, ${z}`);
    }
  }
  // Compare the decoded, transformed render terrain with the movement heightfield.
  const terrain=api.scene.getObjectByName('grass');
  check(terrain?.isMesh,'Authored ground mesh missing');
  terrain.updateWorldMatrix(true,false);
  const attr=terrain.geometry.attributes.position,index=terrain.geometry.index;
  const a=api.camera.position.clone(),b=a.clone(),c=a.clone();let maxSurfaceError=0,checked=0;
  for (let i=0;i<(index?.count??attr.count)-2;i+=Math.max(3,3*Math.floor((index?.count??attr.count)/180))) {
    const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
    a.fromBufferAttribute(attr,ids[0]).applyMatrix4(terrain.matrixWorld);
    b.fromBufferAttribute(attr,ids[1]).applyMatrix4(terrain.matrixWorld);
    c.fromBufferAttribute(attr,ids[2]).applyMatrix4(terrain.matrixWorld);
    a.add(b).add(c).multiplyScalar(1/3);
    const height=api.sampleHeight(a.x,a.z);
    if(height===null)continue;
    const error=Math.min(Math.abs(height-a.y),Math.abs(height-a.y-.025));
    maxSurfaceError=Math.max(maxSurfaceError,error);checked++;
  }
  check(checked>20 && maxSurfaceError<.025,`Decoded ground/sampler mismatch: ${maxSurfaceError}m`);
  // Press hard against the closed hall entrance, then slide along the angled facade.
  api.setView('entrance');
  const start=api.camera.position.clone();
  for(let i=0;i<30;i++)api.move(.514*.5,.858*.5);
  const stopped=api.snapshot();
  check(stopped.supported && Math.hypot(stopped.position[0]-start.x,stopped.position[2]-start.z)<8,'Walked through the closed hall');
  check(stopped.position[1]<3,'Movement climbed onto the roof');
  const collision=api.world.data.obstacles.find(o=>o.id==='hall').polygon;
  const inside=(x,z,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
  check(!inside(stopped.position[0],stopped.position[2],collision),'Hall collision penetration');
  const beforeSlide=api.camera.position.clone();
  for(let i=0;i<10;i++)api.move(-.35,.05);
  const slidingDistance=api.camera.position.distanceTo(beforeSlide);
  check(slidingDistance>.3 && api.snapshot().supported,'Angled wall sliding stuck');
  // Closed boundary wall at entrance and unsupported pilot edge; large sprint-like displacements.
  api.reset();for(let i=0;i<20;i++)api.move(-.8,-.5);
  const gateStop=api.snapshot();check(gateStop.supported,'Crossed the entrance boundary');
  api.reset();for(let i=0;i<100;i++)api.move(.5,.85);
  check(api.snapshot().supported,'Sprinting crossed the pilot edge or obstacle');
  check(!api.canStand(-49.5,-84.5) && api.sampleHeight(-1000,0)===null,'Unsupported terrain must be refused');
  api.setView('overhead');const overhead=api.camera.position.clone();
  check(!api.move(1,0) && api.camera.position.equals(overhead),'Inspection view enabled walking');
  api.reset();check(api.snapshot().mode==='walk' && Math.abs(api.camera.position.y-api.sampleHeight(api.camera.position.x,api.camera.position.z)-eyeHeight)<.001,'Reset did not re-ground the camera');
  timings.sort((a,b)=>a-b);
  const gl=api.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {routePoints:route.length,frameSamples:timings.length,meanFrameMs:timings.reduce((a,b)=>a+b,0)/timings.length,
    p95FrameMs:timings[Math.floor(timings.length*.95)],maxDrawCalls:Math.max(...calls),
    floorRange:[minFloor,maxFloor],decodedGroundSamples:checked,maxSurfaceError,slidingDistance,
    gateStop:gateStop.position,hallStop:stopped.position,buffer:[api.renderer.domElement.width,api.renderer.domElement.height],
    gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,ua:navigator.userAgent,
    resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')||r.name.includes('/libs/')).map(r=>({url:r.name,bytes:r.encodedBodySize,transfer:r.transferSize}))};
}
