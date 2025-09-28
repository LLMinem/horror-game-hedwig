# Hedwig Backlog (Eisenhower Matrix)

## Urgent & Important (Do Now)
- **Visible moon tied to light controls**: create an actual moon asset (billboard or small sphere with texture) that tracks `moonX/moonY/moonZ`, so the sky visually matches the directional light.

## Important & Not Urgent (Plan Ahead)
- **Cascaded or dynamic moon shadows**: our current moon shadow frustum is deliberately tight (±18 m) for crisp detail, which means shadows disappear once objects fall outside that box. When the cemetery expands to ~250 m, evaluate either cascaded shadow maps or a player-centered dynamic frustum so near ground stays sharp while distant ground still receives shadows.

## Urgent & Not Important (Delegate / Quick Wins)
- _None logged yet_

## Not Urgent & Not Important (Consider Later / Maybe Never)
- **Scripted moon path demo**: animate the moon position over time to showcase lighting/shadow changes for friends and family.
