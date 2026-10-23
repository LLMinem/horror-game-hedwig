# Hedwig

Hedwig is intended to become an atmospheric horror game. Its setting is a faithful, walkable reconstruction of Neuer Friedhof in Bruchköbel, Germany, at dusk or night. Gameplay and story details remain open for refinement. The eventual game should support English and German.

[GitHub Issues](https://github.com/LLMinem/horror-game-hedwig/issues) hold specifications, plans, progress and acceptance. The [approved cemetery environment specification](https://github.com/LLMinem/horror-game-hedwig/issues/21) defines that milestone, not a completed gameplay MVP. Read an issue's comments and dependencies as well as its original description.

## Run locally

Use a Node version supported by [package.json](package.json), then run from the repository root:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The dev server starts at <http://127.0.0.1:3000> and tries the next available port if that port is occupied. You can request a different starting port with `npm run dev -- --port 3100`.

Click the scene to capture the mouse. WASD moves, Shift sprints, F toggles the flashlight and Esc releases the mouse. The review panel provides neutral/dusk lighting and fixed views, including a whole-site overview and regional ground stations. Overhead views are inspection-only; select a ground view or "Walk from entrance" to resume walking. `?mode=sandbox` opens the separate lamp sandbox.

The cemetery view integrates the retained pilot with an **unaccepted coarse spatial candidate for [#22](https://github.com/LLMinem/horror-game-hedwig/issues/22)**. New routes, facility masses and planting are provisional; rounded foliage volumes indicate broad vegetation masses, not individual trees. Ordinary grave fields are not yet modeled. This is neither completed quality B nor human source/browser acceptance.

`npm run build` creates `dist/`; `npm run preview` serves the build at <http://127.0.0.1:4173>. These are local checks, not deployment. Hosting and public release require separate authorization.

A clone includes runtime derivatives, not the private photographs, acquired reference data or editable source assets. See [local references](docs/local-references.md) before source work.

## Find the right document

| Need | Read |
| --- | --- |
| Work as an agent | [Agent entry](AGENTS.md) |
| Understand a project term | [Glossary](GLOSSARY.md) |
| Understand a consequential technical choice | [Decision records](docs/adr/) |
| Read or develop the provisional story | [Story draft](docs/lore-backstory.md) |
| Use private photographs, corrections or the Atlas | [Local references](docs/local-references.md) |
| Interpret the source map, coordinates or terrain | [Site data contract](data/README.md) |
| Author sources, export assets or verify their browser appearance | [Blender and asset workflow](docs/assets/blender-workbench.md) |

Documentation and new planning/issue text use English. Existing German issues may remain German. Project-language policy does not change the German setting or require immediate game localization.

## Attribution and rights

Source map: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Terrain derives from Hessen HVBG DGM1 under [dl-zero-de/2.0](https://www.govdata.de/dl-de/zero-2-0), with a locally adjusted Chapel platform. The [site data contract](data/README.md) explains source provenance and redistribution boundaries. Other asset permissions and release checks belong to the [asset workflow](docs/assets/blender-workbench.md).
