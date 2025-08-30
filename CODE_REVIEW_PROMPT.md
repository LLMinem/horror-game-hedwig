# Code Review Request: Ground Plane Rendering Issue

## Priority: CRITICAL - Blocking Development

### Problem Summary
The ground plane in our Three.js scene renders as a horizontal line instead of a visible floor. The plane exists (line changes color with material changes) but appears edge-on despite seemingly correct setup.

### Your Task
Please analyze `/src/main.js` (lines 84-107 specifically) to identify why the ground plane isn't visible as a floor. Focus on:

1. **Geometry Creation** - Is PlaneGeometry being created correctly?
2. **Transformations** - Are rotation and position being applied in the right order?
3. **Vertex Modifications** (lines 94-101) - Could the height variations be breaking the plane?
4. **Camera Math** - Verify the viewing angle calculation
5. **Three.js Version Issues** - Any known issues with PlaneGeometry in latest Three.js?

### Key Symptoms
- Horizontal line visible where ground should be
- Line changes color when material color changes
- Camera at (0, 5, 15) looking at (0, 0, 0)
- Ground rotated -Math.PI/2 and positioned at y=0
- All other scene elements render correctly

### What We've Verified Works
- ✅ Rotation is correct (-Math.PI/2 for horizontal)
- ✅ Material is double-sided
- ✅ Ground is added to scene
- ✅ No console errors
- ✅ Lighting and other objects work fine

### Most Suspicious Code
```javascript
// Lines 94-101: Vertex modifications
const positionAttribute = groundGeometry.attributes.position;
for (let i = 0; i < positionAttribute.count; i++) {
  const y = 0.1 * Math.random() - 0.05;
  positionAttribute.setY(i, y);
}
groundGeometry.computeVertexNormals();
```

Could this be corrupting the plane geometry?

### Expected Outcome
Identify the exact line(s) causing the ground to render as a line instead of a visible plane, and provide a fix.

### GitHub Issue
Full details with all troubleshooting steps: https://github.com/LLMinem/horror-game-hedwig/issues/2