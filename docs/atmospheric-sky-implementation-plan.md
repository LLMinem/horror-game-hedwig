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

### Step 1: Four-Stop Gradient Shader ✅
**What**: Upgrade from 2-color to 4-color gradient with smooth transitions
**Why**: Real skies have multiple transition zones, not just top/bottom
**How**: Add two middle color uniforms and use smoothstep for blending

**Concepts for Beginners**:
- **Uniforms**: Variables we pass from JavaScript to the shader
- **Smoothstep**: Creates smooth S-curve transitions instead of linear
- **Fragment shader**: Runs for every pixel, determines its color

**Testing**:
- Should see more complex gradient
- Horizon should be warmer/lighter
- Multiple transition zones visible
- GUI controls for all 4 colors

---

### Step 2: Light Pollution Radial Glow 🔄
**What**: Add directional glow simulating village lights
**Why**: Rural areas have subtle light domes from nearby settlements
**How**: Calculate angle to village, apply radial falloff with noise

**Concepts for Beginners**:
- **Radial falloff**: Light gets weaker with distance
- **Noise texture**: Adds random variation for realism
- **Directional glow**: Stronger in direction of light source

**Testing**:
- Subtle glow in one direction
- Patchy/cloudy variation, not uniform
- Adjustable intensity and direction

---

### Step 3: Dithering (Anti-Banding) 📋
**What**: Add ordered dithering to prevent color banding
**Why**: Subtle gradients create visible bands on 8-bit monitors
**How**: Add tiny noise pattern that breaks up smooth transitions

**Concepts for Beginners**:
- **Color banding**: Visible steps in gradients due to limited colors
- **Dithering**: Pattern of dots that tricks eye into seeing smooth gradients
- **Ordered dithering**: Predictable pattern that's less noisy than random

**Testing**:
- Smooth gradients without visible bands
- May see subtle grain up close (normal)
- Significantly improved on standard monitors

---

### Step 4: Procedural Star Field 📋
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

- [ ] No visible color banding
- [ ] Seamless fog integration at horizon
- [ ] 60 FPS maintained
- [ ] Visible but subtle light pollution
- [ ] Stars create sense of depth
- [ ] Horror atmosphere enhanced
- [ ] All effects controllable via GUI

## 🎮 Testing Checklist

After each step:
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

*Last Updated: December 2024*
*For: Horror Game Project - Night Scene Implementation*