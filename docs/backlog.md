# Hedwig Backlog (Eisenhower Matrix)

## Urgent & Important (Do Now)
- **Visible moon tied to light controls**: create an actual moon asset (billboard or small sphere with texture) that tracks `moonX/moonY/moonZ`, so the sky visually matches the directional light.
- **Street lamp emissive binding**: drive `MeshStandardMaterial.emissiveIntensity` from dev-room GUI so runtime slider lerps 0.1 (off baseline) ↔ 1.5 (max glow) to match Blender authoring.

## Important & Not Urgent (Plan Ahead)
- **Cascaded or dynamic moon shadows**: our current moon shadow frustum is deliberately tight (±18 m) for crisp detail, which means shadows disappear once objects fall outside that box. When the cemetery expands to ~250 m, evaluate either cascaded shadow maps or a player-centered dynamic frustum so near ground stays sharp while distant ground still receives shadows.
- **Evaluate Biome tooling**: once asset integration and gameplay scaffolding stabilize, test migrating formatting/linting to Biome for a faster single-tool workflow (replaces our absent ESLint/Prettier setup and keeps future projects consistent).
- **Project-wide KTX2 compression**: add a conversion step plus loader wiring so every shipped prop has `.ktx2` textures (1 K/2 K variants) to keep web download sizes in check.
- **Loading screen polish**: design a thematic preloader page with art + “Begin” button to distract from large asset loads.
- **Interactive intro overlay**: show controls, goals, and “press ESC to unlock mouse” guidance while the scene finishes initializing; tap-to-start drops the player into the world.
- **In-game HUD shell**: add lightweight navigation elements (settings toggle, lil-gui visibility button, etc.) so the game window feels intentional.

## Urgent & Not Important (Delegate / Quick Wins)
- _None logged yet_

## Not Urgent & Not Important (Consider Later / Maybe Never)
- **Scripted moon path demo**: animate the moon position over time to showcase lighting/shadow changes for friends and family.
- **esbuild dev-server advisory**: npm audit flags an esbuild dev-server vulnerability; low concern for local-only Vite usage but keep on radar for future dependency bumps.
