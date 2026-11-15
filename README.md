# STARBOUND &#8211; GAMERKIE EDITION
**ONE HERO. INFINITE WORLDS. NO TWO JOURNEYS ALIKE.**

An endless, procedurally generated 2D physics, grappling, puzzle, exploration, and survival-horror adventure built with vanilla HTML5, CSS3, ES6 JavaScript, Canvas 2D, and the Web Audio API.

## Core Features
1. **Original Orange Stickman & Verlet Rope Physics**: Realistic Störmer-Verlet rope simulation with 40 constraint iterations per frame, raycast terrain corner wrapping, climbing, swinging, and tangential release boosts.
2. **Infinite Validated Procedural Generation**: Mulberry32 seeded generation across grammar patterns, cavern cellular automata, and noise heightmaps. Every level is fingerprinted via a 64-bit structural hash to prevent duplicates against local history (`IndexedDB` / `localStorage`) and verified for solvability via a kinematic A* reachability graph.
3. **12 Original Worlds & 15 Dynamic Weather States**: Traverse Dark Forests, Haunted Forests, Alien Planets, Frozen Worlds, Deserts, Volcanoes, Underground Caves, Abandoned Labs, Swamps, Sky Islands, Bioluminescent Abysses, and the Clockwork Void. Weather directly modifies friction, rope wind drag, and visibility.
4. **Survival Horror & Milestone Bosses**: Dynamic offscreen `destination-out` lantern lighting, psychological audio events, 20+ animated creatures, 15 distinct level objectives, and 7 multi-phase Boss encounters.

## GitHub Pages Deployment Instructions
1. Extract this ZIP and upload all files (`index.html`, `style.css`, `README.md`, `.nojekyll`, and the `js/` directory) to the root of your GitHub repository.
2. Navigate to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment**, select **Deploy from a branch**, choose `main` (or `master`) and `/ (root)`, and click **Save**.
