# ADR-003: Switch from Fragment Shader to Geometry-Based Stars

## Status
**Accepted** - December 2024

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

The fundamental issue is that fragment shaders are inherently view-dependent - they execute based on screen pixels, not world-space geometry. Star positions and brightness should be fixed in world space, not recalculated per viewing angle.

## Decision

**Switch to THREE.Points geometry-based star rendering** with the following implementation:

- Generate fixed star positions in 3D world space using deterministic algorithms
- Use THREE.Points geometry to render stars as individual vertices
- Apply custom vertex and fragment shaders for star appearance
- Implement instanced rendering for performance optimization
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
**Rationale**: Fundamentally flawed architecture cannot be patched. View-dependency is inherent to fragment shader execution model.

### 2. Pre-baked Star Texture (Rejected)
**Rationale**: Less flexible, lower quality, and still requires proper integration with atmospheric effects.

### 3. Icosahedral Grid Mapping (Rejected)
**Rationale**: While mathematically elegant, still suffers from view-dependent aliasing issues and added complexity.

### 4. Hybrid Approach (Rejected)
**Rationale**: Combining fragment shader and geometry approaches would increase complexity without solving core issues.

## Implementation Notes

The new geometry-based approach will:

1. Generate stars during initialization using seeded random algorithms
2. Position stars on celestial sphere at appropriate distance
3. Apply realistic magnitude distribution and color variation
4. Use custom shaders for atmospheric perspective and twinkling effects
5. Integrate properly with fog and other atmospheric systems

This decision aligns with industry best practices and ensures a stable, maintainable star field system for the horror game's atmospheric requirements.

## References

- Three.js Points documentation and examples
- Industry standard practices for celestial rendering in games
- Fragment shader limitations in world-space rendering contexts