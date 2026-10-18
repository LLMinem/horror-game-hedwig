---
type: adr
status: accepted
created: 2025-09-09
last_verified: 2026-10-18
owned_by: human
supersedes: []
superseded_by: []
---

# ADR-003: Switch from Fragment Shader to Geometry-Based Stars

## Status

**Accepted** - 2025.09.09

## Context

During development of the horror game's atmospheric night sky, we initially attempted to implement a procedural star field using fragment shader calculations within the skydome. This approach promised several theoretical benefits:

- Infinite detail without memory overhead
- Mathematical precision in star placement
- Cell-based noise for realistic star clustering
- Seamless integration with existing sky shader

However, after extensive implementation and debugging efforts, fundamental architectural flaws became apparent:

### Core Issues Discovered

1. **View-Dependent Recalculation**: Stars recalculated position and brightness with every camera movement, even single-pixel adjustments, causing visual instability.

2. **Cell-Based Brightness Problems**: The cellular noise approach created brightness calculations that varied based on viewing angle, making stars appear to flicker or change intensity as the camera moved.

3. **Unfixable Architecture**: Multiple attempted solutions failed:

   - Camera position normalization
   - Fixed reference frames
   - Alternative noise functions
   - Brightness clamping and smoothing

4. **Performance Overhead**: Fragment shader executed per-pixel for the entire sky dome, with complex noise calculations running continuously.

The old shader did not preserve celestial directions while the camera moved. Fragment shaders can render stable stars when their coordinates and sampling are correct, so the failure was specific to that implementation. Fixed point geometry makes the direction and rendering cost easier to inspect.

## Decision

**Switch to THREE.Points geometry-based star rendering** with the following implementation:

- Generate random star positions once on the upper celestial hemisphere
- Use THREE.Points geometry to render stars as individual vertices
- Apply custom vertex and fragment shaders for star appearance
- Render the star field in one draw call
- Maintain atmospheric integration through proper depth testing and fog interaction

## Consequences

### Positive

- **Stability**: Stars maintain consistent position and brightness regardless of camera movement
- **Performance**: Geometry-based rendering with fixed vertex count, no per-pixel recalculation
- **Industry Standard**: Aligns with established practices in game development and Three.js
- **Debugging**: Easier to debug and modify individual star properties
- **Scalability**: Can easily adjust star count and distribution
- **Compatibility**: Better integration with Three.js rendering pipeline and post-processing

### Negative

- **Development Cost**: Requires complete rewrite of star system implementation
- **Memory Usage**: Fixed geometry requires memory allocation (minimal impact for star count)
- **Complexity**: Additional shader management and geometry generation code

### Neutral

- **Feature Parity**: Same visual capabilities achievable with different implementation approach
- **Maintenance**: Different but comparable ongoing maintenance requirements

## Alternatives Considered

### 1. Continue Fragment Shader Approach (Rejected)

**Rationale**: The previous implementation had unresolved coordinate and sampling problems. Point geometry provided a simpler replacement.

### 2. Pre-baked Star Texture (Rejected)

**Rationale**: Less flexible, lower quality, and still requires proper integration with atmospheric effects.

### 3. Icosahedral Grid Mapping (Rejected)

**Rationale**: While mathematically elegant, still suffers from view-dependent aliasing issues and added complexity.

### 4. Hybrid Approach (Rejected)

**Rationale**: Combining fragment shader and geometry approaches would increase complexity without solving core issues.

## Implementation Notes

The current implementation keeps a camera-centered skydome and a separate `THREE.Points` object. Camera translation moves both objects, but camera rotation does not change their world directions. Only an explicit star-count change regenerates the geometry. Reloads and count changes generate a new random field; a seeded catalog is not implemented.

Stars use independent random azimuths and uniform altitude samples. Uniform polar angles would crowd the zenith, so the generator samples equal areas of the hemisphere instead. Close pairs and gaps arise from independent sampling, without a cell grid or an authored cluster model.

Star sizes are CSS pixels, with a two-pixel minimum footprint and reduced opacity for smaller stars. Pixel ratio scales the footprint. The size no longer depends on camera-space depth or the chosen sphere radius. The sky and stars use Three.js tone mapping and output color conversion. The sky blends fog after those steps, matching the color space used by fog on scene objects, and then adds output-space dithering. The existing altitude-based fog blend and horizon fades remain artistic controls rather than a volumetric atmosphere model.

### Browser verification, 2026-10-18

The checks used an isolated Chrome 148 session on an Apple M3 Max with the ANGLE Metal renderer. The dev server ran on port 3102. Local probes, console output and PNGs are under `.local/atmosphere-2026-10-18-r01/`; they are not public assets.

- A fully fogged object and the sky horizon previously differed by 73 channel levels for `#808080`. After the output-color correction, both rendered `[128, 128, 128]`. The default fog color also matched at `[20, 22, 24]`. Screenshots cover the default sandbox fog, density `0.05` with color `#456578`, linear fog, and the pilot's neutral and dusk views.
- The original 3,000-star field had 4.29 times as many stars in its fullest equal-area altitude band as its emptiest. After correcting the sampling, a measured field had a ratio of 1.25. The unchanged default brightness and size settings produced readable stars in the saved sandbox and pilot views.
- A rendered star remained at the same pixel and brightness after a translation of `[150, 15, -75]`. A `0.002`-radian turn moved it by one pixel rather than replacing it. Larger turns preserved its projected location and peak brightness, with normal subpixel coverage changes. Geometry and position arrays stayed unchanged. DPR 1 and DPR 2 checks also covered star size and the vignette's drawing-buffer resolution.
- At 1280 × 720, 180-frame samples averaged 16.67 ms for both 10,000 and 100,000 stars while looking upward. The 100,000-star field had 32,662 points inside the camera frustum and used one star draw call, with three total scene calls in that view. At 2560 × 1440 it averaged 16.69 ms. The default sandbox view with the lamp averaged 16.67 ms with five calls. No browser runtime errors were recorded.

The performance samples are display-limited measurements of the sandbox on this Mac. They do not establish a mid-range hardware result, distinguish every overlapping star, or prove full-cemetery performance. Source inspection alone was not used as evidence of browser behavior.

## References

- Three.js Points documentation and examples
- Industry standard practices for celestial rendering in games
- Fragment shader limitations in world-space rendering contexts
