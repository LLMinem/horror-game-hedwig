# Atmospheric Sky Implementation Plan

## 🎯 Goal
Transform the current simple 2-color gradient sky into a realistic, atmospheric night sky that enhances the horror game atmosphere while maintaining performance.

## 📚 Background Research Summary

### Why Current Sky Looks Wrong
- **Too simple**: 2-color gradient lacks the complexity of real night skies
- **Pure blacks**: Creates "void" feeling rather than atmosphere
- **No variation**: Missing the subtle noise and variations of real atmosphere
- **Color banding**: Smooth gradients create visible bands on 8-bit displays
- **Missing stars**: No reference points make darkness feel flat

### What Makes Night Skies Realistic
1. **Multi-stop gradients**: Real skies have 3-4 distinct zones
2. **Light pollution**: Creates warm glow at horizon (never pure black)
3. **Atmospheric scattering**: Causes subtle blue-grey tones even in darkness
4. **Noise variation**: Subtle variations prevent flat appearance
5. **Stars with falloff**: Brightest at zenith, fade near horizon

## 🎨 Target Color Palette

Based on research for rural cemetery (200-250m from village):

```javascript
// 4-stop gradient from horizon to zenith
Horizon:     #2B1E1B  // Warm grey-brown (sodium lamp pollution)
Mid-Low:     #15131C  // Dark plum (transition zone)
Mid-High:    #0D1019  // Deep grey-blue (main sky)
Zenith:      #060B14  // Very dark indigo (darkest but NOT black)
```

## 🏗️ Implementation Steps

### Step 1: Four-Stop Gradient Shader ✅ [2025-09-07]
**Status**: COMPLETE - Implemented with full GUI integration  
**What**: Upgrade from 2-color to 4-color gradient with smooth transitions  
**Why**: Real skies have multiple transition zones, not just top/bottom  
**How**: Add two middle color uniforms and use smoothstep for blending  

**Implementation Notes**:  
- Created custom GLSL vertex/fragment shaders  
- Fixed critical bug: gradient now calculated from camera position, not world origin  
- Used eye-ray calculation for proper horizon alignment  
- Full GUI controls for all 4 colors + transition positions  
- Smooth transitions using smoothstep function  

**Known Issues**:  
- Colors are functional but too subtle - needs tuning for better visibility  
- Considered acceptable for initial implementation  

**Testing Results**:  
✅ Complex gradient with 4 distinct zones  
✅ Proper horizon alignment  
✅ GUI controls responsive  
✅ No z-fighting or rendering issues

---

### Step 2: Light Pollution Radial Glow ✅ [2025-09-08]
**Status**: COMPLETE - Implemented dual-source light pollution system  
**What**: Add directional glow simulating village lights  
**Why**: Rural areas have subtle light domes from nearby settlements  
**How**: Calculate angle to village, apply radial falloff with noise  

**Implementation Notes**:  
- Upgraded from single-source to **dual-source system** for enhanced realism  
- **Near village** (NW, 250m): Noticeable orange glow with physics-based falloff  
- **Distant village** (SE, 2km): Subtle background glow with altitude fade  
- Full GUI controls for both light pollution sources  
- Physics-based intensity calculation with atmospheric scattering simulation  

**Concepts for Beginners**:
- **Radial falloff**: Light gets weaker with distance (inverse square law)
- **Altitude fade**: Light pollution fades as you look higher in the sky
- **Directional glow**: Stronger in direction of light source
- **Dual-source system**: Multiple light sources create more realistic sky variation

**Fine-tuning Update** [2025-09-08]:  
Based on real-world testing, adjusted default values for more realistic appearance:
- **Near village**: Wider spread (90° vs 70°), higher reach (40% vs 30% altitude)
- **Distant village**: More visible but subtle (0.1 vs 0.08 intensity, 50° vs 40° spread)  
- **Extended GUI ranges**: Spread now adjustable from 30-120° for better control
- Result: More natural light pollution that better matches rural cemetery lighting

**Testing Results**:  
✅ Near village creates noticeable but not overpowering glow  
✅ Distant village provides subtle atmospheric enhancement  
✅ Both sources have independent controls  
✅ Physics-based falloff feels natural  
✅ No performance impact on 60 FPS target
✅ Fine-tuned values provide more realistic appearance

---

### Step 3: Dithering (Anti-Banding) ✅ [2025-09-08]
**Status**: COMPLETE - Implemented ordered dithering with hash-based screen-space noise
**What**: Add ordered dithering to prevent color banding
**Why**: Subtle gradients create visible bands on 8-bit monitors
**How**: Add tiny noise pattern that breaks up smooth transitions

**Implementation Notes**:
- Hash-based screen-space noise function for consistent, ordered pattern
- Default strength: 0.008 (effective but subtle)
- Acts like "anti-aliasing for gradients"
- Full GUI control with fine adjustment range (0.0-0.02)
- Minimal performance impact - single hash calculation per pixel

**Concepts for Beginners**:
- **Color banding**: Visible steps in gradients due to limited colors
- **Dithering**: Pattern of dots that tricks eye into seeing smooth gradients
- **Ordered dithering**: Predictable pattern that's less noisy than random
- **Hash function**: Mathematical way to create pseudo-random patterns from screen position
- **Screen-space noise**: Pattern based on pixel position, not world coordinates

**Testing Results**:
✅ Eliminates visible color bands in 4-stop gradient sky
✅ Subtle grain effect that enhances rather than distracts
✅ GUI controls allow fine-tuning for different displays
✅ No performance impact on 60 FPS target
✅ Works consistently across all viewing angles

---

### Step 4: Procedural Star Field 📋
**Status**: PENDING
**What**: Generate stars directly in shader
**Why**: Stars provide depth and reference points
**How**: Hash function creates random points with varying brightness

**Concepts for Beginners**:
- **Procedural generation**: Creating content with math instead of textures
- **Hash function**: Converts position to random-looking number
- **Altitude fade**: Stars disappear near horizon (atmospheric extinction)

**Testing**:
- 3000-6000 visible stars
- Varying brightness and slight color
- Fade out near horizon
- Optional subtle twinkle

---

### Step 5: Atmospheric Noise 📋
**Status**: PENDING
**What**: Add subtle cloud/haze variations
**Why**: Real atmosphere has moisture, dust, pollution creating variations
**How**: Simplex noise modulates gradient colors

**Concepts for Beginners**:
- **Simplex noise**: Smooth random patterns (like clouds)
- **Modulation**: Using noise to vary other values
- **Animated drift**: Slow movement for living atmosphere

**Testing**:
- Subtle variations in sky color
- Slow drift animation
- More variation near horizon

---

### Step 6: Horror Atmosphere Tuning 📋
**Status**: PENDING
**What**: Fine-tune colors and effects for maximum horror impact
**Why**: Effective horror skies are subtly "wrong"
**How**: Desaturate colors, add slight green tint, adjust contrast

**Testing**:
- Slightly unsettling feeling
- Good visibility for gameplay
- Silhouettes stand out
- Maintains performance

## 🔧 Technical Architecture

### Shader Structure
```glsl
// Vertex shader: Calculate altitude and world position
varying float vAltitude;  // 0 at horizon, 1 at zenith
varying vec3 vWorldPos;   // For noise and star calculations

// Fragment shader: Combine all effects
1. Base 4-stop gradient
2. + Light pollution glow
3. + Atmospheric noise
4. + Procedural stars
5. + Dithering pattern
6. = Final pixel color
```

### Performance Targets
- **Desktop**: < 1ms GPU time
- **Mobile**: < 2ms GPU time
- **Draw calls**: 1 (single dome)
- **Texture memory**: < 1MB (noise texture only)

## 📊 GUI Controls Structure

```javascript
Sky Settings/
├── Base Gradient/
│   ├── Horizon Color
│   ├── Mid-Low Color
│   ├── Mid-High Color
│   ├── Zenith Color
│   └── Stop Positions (2 sliders)
├── Light Pollution/
│   ├── Intensity
│   ├── Direction
│   ├── Falloff Distance
│   └── Noise Amount
├── Stars/
│   ├── Density
│   ├── Brightness
│   ├── Twinkle Speed
│   └── Horizon Fade
└── Atmosphere/
    ├── Noise Scale
    ├── Noise Speed
    ├── Noise Strength
    └── Dithering Amount
```

## 🚨 Common Pitfalls to Avoid

1. **Don't use pure black** - Always keep some color, even in darkest areas
2. **Don't forget depthWrite: false** - Sky must render behind everything
3. **Don't skip dithering** - Essential for smooth gradients
4. **Don't make stars too bright** - Subtle is more realistic
5. **Don't ignore fog integration** - Sky and fog must blend seamlessly

## 📈 Success Metrics

- [x] **Step 1 Complete**: Four-stop gradient with smooth transitions ✅
- [x] **Performance**: 60 FPS maintained ✅
- [x] **GUI Integration**: All Step 1 controls working ✅
- [x] **Proper Positioning**: Fixed horizon alignment bug ✅
- [x] **Step 2 Complete**: Dual-source light pollution system ✅
- [x] **Step 3 Complete**: Dithering eliminates color banding ✅
- [ ] **Step 4**: Procedural star field for depth
- [ ] **Step 5**: Atmospheric noise variations
- [ ] **Step 6**: Horror atmosphere tuning

## 🎮 Testing Checklist

**Step 1 Results** (Completed 2025-09-07):
1. ✅ Performance maintained at 60 FPS
2. ✅ No visual artifacts detected
3. ✅ All GUI controls functional
4. ✅ Proper horizon alignment from all angles
5. ✅ No z-fighting issues
6. ⚠️ Colors need tuning (too subtle)

**After each remaining step**:
1. Check performance (FPS counter)
2. Look for visual artifacts
3. Test all GUI controls
4. View from multiple angles
5. Check fog blending
6. Verify no z-fighting

## 📝 Notes

- This plan builds incrementally - each step works standalone
- Can stop at any step and have functional sky
- Later steps enhance but don't require earlier ones
- Designed for Three.js r179 specifics
- Balances realism with horror atmosphere needs

## 🔗 References

- Three.js r179 ShaderMaterial docs
- Atmospheric scattering research
- AAA game sky rendering techniques
- Horror game atmosphere analysis

---

*Last Updated: September 8, 2025*  
*Step 3 Complete: Dithering (anti-banding) with hash-based screen-space noise*  
*For: Horror Game Project - Night Scene Implementation*