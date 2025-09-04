# Game Lore & Backstory: The Uncle and The Lady

## Character Relationships

### The Player

- **Identity:** Nephew/niece of the husband character
- **Role:** Must navigate the cemetery while avoiding both uncle and (future) wife's ghost
- **Connection:** Family tie creates emotional complexity beyond simple enemy avoidance

### The Uncle (Current "Husband" Character)

- **Relationship to Player:** Uncle
- **Current State:** Severe dementia following wife's death
- **Behavior:** Aimlessly roams cemetery searching for his deceased wife's grave
- **Emotional Core:** Desperately, hopelessly in love; cannot live without her

### The Lady (Future Character)

- **Identity:** Uncle's deceased wife
- **Current State:** Dead, appears as aggressive ghost
- **Relationship Dynamic:** Was the controlling partner in a toxic but loving marriage
- **Role:** Primary antagonist when implemented post-MVP

## The Tragic Love Story

### Their Relationship While Alive

- **Love:** She was the one and only love of his life
- **Dependency:** He was utterly, completely dependent on her for stability and direction
- **Power Dynamic:** She controlled his life entirely; he was afraid but couldn't leave
- **Toxicity:** Their relationship gave him stability but at the cost of his autonomy
- **Codependency:** He literally could not function or live without her presence

### After Her Death

- **Mental Breakdown:** Uncle developed severe dementia following her death
- **Obsessive Grief:** Visits her grave multiple times daily, searching for her
- **Memory Loss:** Cannot remember where her grave is located due to dementia
- **Behavioral Pattern:** Endlessly wanders between graves, hoping to find her
- **Mumbling:** Speaks words that sound distantly familiar to the player but remain unclear

## Current Game Mechanics (MVP)

### Uncle's Behavior Patterns

- **Random Pathing:** Chooses one of 8 flowery graves to path toward
- **Grave Interaction:** Stops at each grave, interacts (searching for his wife), then moves to next
- **Non-Aggressive:** Not directly dangerous, but player loses if he gets too close (≤5m)
- **Path-Bound:** Currently stays on cemetery paths, respects gates and fences
- **Speed:** 3.675 m/s (slightly faster than player's walk speed)
- **Audio Cues:** Mumbles that the player can hear from 25m distance

### Current Game Loop

- Player must water 8 target graves while avoiding uncle
- Uncle provides tension through proximity but isn't actively hunting player
- Win condition: Water all 8 graves
- Lose condition: Uncle gets within 5 meters of player

## Future Vision: The Lady Implementation

### Enhanced Lore Mechanics (Post-MVP)

#### Dual-Mode Uncle Behavior

1. **Idle-Roaming Mode (Current)**
   - Confused wandering between graves
   - Dementia-driven search behavior
   - Paths randomly, stays on designated routes
   - Mumbles incoherently
   - Predictable movement patterns

2. **Wife-Seeking Mode (New)**
   - **Trigger:** Lady's ghost appears anywhere on map
   - **Behavior Change:** Uncle instantly snaps out of depression/confusion
   - **Pathing:** Aggressively paths directly toward lady's location
   - **Route Breaking:** No longer bound to paths—will navigate around buildings
   - **Emotional Driver:** Pure love and desperation, not aggression toward player
   - **Danger:** Creates potential for player to be cornered between uncle and lady

#### The Lady's Mechanics

- **Teleportation:** Can appear randomly across the cemetery
- **Aggression Scaling:** Becomes more active/dangerous as player waters more graves
- **Visual Presence:** When visible, immediately triggers uncle's wife-seeking mode
- **Strategic Threat:** Her appearances must be anticipated to avoid getting trapped

#### Advanced Gameplay Dynamics

- **Unpredictable Danger:** Lady can teleport, making uncle's movement suddenly unpredictable
- **Tracking Challenge:** Player must mentally track uncle's location at all times
- **Escalating Tension:** More watered graves = more lady appearances = more dangerous uncle behavior
- **Cornering Risk:** Primary danger comes from being caught between both characters
- **Emotional Complexity:** Uncle isn't trying to attack—his love makes him dangerous

### Psychological Horror Elements

#### Dementia Representation

- **Memory Confusion:** Uncle can't remember grave locations despite visiting daily
- **Repetitive Behavior:** Endless, purposeless movement between graves
- **Moments of Clarity:** When lady appears, brief return to focused behavior
- **Family Recognition:** Unclear if uncle recognizes the player as family member

#### Relationship Trauma Themes

- **Codependency:** Uncle's complete inability to function without his wife
- **Toxic Love:** Relationship that was both nurturing and controlling
- **Grief Processing:** Uncle's inability to accept or process his wife's death
- **Power Dynamics:** Even in death, lady continues to control uncle's actions

## Implementation Notes

### Current MVP Status

- Uncle character exists and patrols cemetery
- Basic proximity-based lose condition implemented
- Audio cues provide atmospheric tension
- Player must strategically plan routes while tracking uncle

### Future Development Priorities

1. **Lady Character Creation**
   - Ghost-like appearance and animations
   - Teleportation mechanics
   - Progressive aggression system tied to player progress

2. **Uncle Behavior Enhancement**
   - Dual-mode AI system (roaming vs. wife-seeking)
   - Path-breaking navigation when lady appears
   - Enhanced audio cues for different modes

3. **Dynamic Threat System**
   - Lady appearance triggers based on graves watered
   - Escalating difficulty through increased appearances
   - Strategic positioning requirements for player safety

### Emotional Impact Goals

- Create empathy for uncle despite him being an obstacle
- Generate tension through unpredictability rather than direct aggression
- Explore themes of love, loss, dependency, and mental illness
- Use family connection to add personal stakes beyond simple survival

## Technical Considerations

### AI Behavior States

- **Current:** Simple pathfinding between predetermined grave locations
- **Enhanced:** State machine with roaming/seeking modes
- **Trigger System:** Lady visibility instantly switches uncle to seeking mode
- **Navigation:** Pathfinding that can break from preset routes when necessary

### Balancing Challenges

- Uncle must remain threatening without being frustrating
- Lady appearances must feel random but fair
- Cornering scenarios should be avoidable with skill and awareness
- Family relationship adds emotional weight without compromising horror atmosphere

---

_This lore document captures the creative vision for expanding the cemetery horror game beyond simple chase mechanics into a complex emotional narrative about family, love, loss, and mental illness. The uncle character transforms from a simple AI obstacle into a tragic figure whose love becomes the source of danger, creating unique gameplay dynamics rooted in authentic human emotions._
