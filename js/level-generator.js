import { DifficultySystem } from "./difficulty.js";
import { WorldGenerator } from "./world-generator.js";
import { EnemySystem } from "./enemies.js";
import { BossEncounter } from "./bosses.js";

export function createMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class LevelGenerator {
  static generateCandidate(levelNumber, attempt = 0, lastWorldId = null, profileSalt = 1337) {
    const seed = ((levelNumber * 2654435761) ^ (attempt * 97531) ^ profileSalt) >>> 0;
    const rng = createMulberry32(seed);
    const diff = DifficultySystem.getProfile(levelNumber);
    const world = WorldGenerator.selectWorld(levelNumber, rng, lastWorldId);
    const weatherKey = world.weathers[Math.floor(rng() * world.weathers.length)];

    const platforms = [];
    const anchors = [];
    const stars = [];
    const props = [];
    const switches = [];
    const gates = [];
    const beacons = [];
    const enemies = [];
    const plants = [];
    const hazards = [];

    let curX = 60;
    let curY = 460;
    platforms.push({
      x: curX,
      y: curY,
      w: 220,
      h: 36,
      type: "static",
      friction: world.surfaceFriction,
      isMud: world.id === "swamp_world"
    });

    const startPos = { x: curX + 50, y: curY - 52 };
    curX += 220;

    const algoMode = Math.floor(rng() * 3);

    let segmentIndex = 0;
    while (curX < diff.levelLength) {
      const gap = diff.gapRange[0] + rng() * (diff.gapRange[1] - diff.gapRange[0]);
      const width = diff.platformWidthRange[0] + rng() * (diff.platformWidthRange[1] - diff.platformWidthRange[0]);

      let dy = (rng() - 0.48) * 115;
      if (algoMode === 1) dy = (segmentIndex % 2 === 0 ? -75 : 65);
      curY = Math.max(220, Math.min(560, curY + dy));

      if (gap > 115 |

| algoMode === 2 |
| rng() < 0.65) {
        anchors.push({
          x: curX + gap * 0.5,
          y: Math.max(110, curY - 135 - rng() * 35)
        });
      }

      curX += gap;
      const isMoving = !diff.isBossLevel && rng() < 0.22 && segmentIndex > 0;
      const isCollapsing = !isMoving && !diff.isBossLevel && rng() < 0.16 && segmentIndex > 1;

      const plat = {
        x: curX,
        y: curY,
        w: width,
        h: 32,
        originX: curX,
        originY: curY,
        type: isMoving ? "moving" : (isCollapsing ? "collapsing" : "static"),
        rangeX: isMoving ? 45 : 0,
        rangeY: isMoving ? 25 : 0,
        speed: 1.6 + rng() * 1.2,
        collapseTimer: 0.65,
        friction: world.surfaceFriction,
        isMud: world.id === "swamp_world" && rng() < 0.4
      };
      platforms.push(plat);

      if (stars.length < 3 && (segmentIndex % 2 === 1 |

| curX > diff.levelLength * 0.7)) {
        stars.push({
          x: curX + width * 0.5,
          y: curY - 48 - (rng() < 0.4 ? 45 : 0),
          r: 12,
          collected: false
        });
      }

      if (!plat.type.includes("moving") && width >= 135 && switches.length < 2 && rng() < 0.35) {
        props.push({
          x: curX + 20,
          y: curY - 38,
          w: 32,
          h: 32,
          vx: 0,
          vy: 0
        });
        const swId = switches.length + 1;
        switches.push({
          id: swId,
          x: curX + width - 48,
          y: curY - 10,
          w: 28,
          h: 10,
          active: false,
          latched: true
        });
      }

      if (beacons.length < 2 && rng() < 0.3) {
        beacons.push({
          x: curX + width * 0.35,
          y: curY - 44,
          w: 20,
          h: 44,
          active: false
        });
      }

      if (!diff.isBossLevel && width >= 110 && enemies.length < diff.enemyCount && rng() < 0.55) {
        const archetypes = ["spider", "wolf", "bat", "ghost", "alien_predator", "shadow_stalker"];
        const arch = archetypes[Math.floor(rng() * archetypes.length)];
        enemies.push(EnemySystem.createEnemy(arch, curX + width * 0.5, curY - 26, plat, diff.enemySpeedMult));
      }

      if (rng() < 0.48) {
        const plantTypes = ["glowing_flower", "carnivorous", "thorny", "poison_mushroom"];
        const pt = plantTypes[Math.floor(rng() * plantTypes.length)];
        plants.push(EnemySystem.createPlant(pt, curX + 16 + rng() * (width - 40), curY - 24));
      }

      curX += width;
      segmentIndex++;
    }

    while (stars.length < 3) {
      const p = platforms[Math.min(platforms.length - 1, stars.length + 1)];
      stars.push({ x: p.x + p.w * 0.5, y: p.y - 45, r: 12, collected: false });
    }
    if (switches.length === 0 && platforms.length > 2) {
      const p = platforms[1];
      switches.push({ id: 1, x: p.x + p.w * 0.5, y: p.y - 10, w: 28, h: 10, active: false, latched: true });
    }
    if (beacons.length === 0 && platforms.length > 2) {
      const p = platforms[2];
      beacons.push({ x: p.x + p.w * 0.5, y: p.y - 44, w: 20, h: 44, active: false });
    }

    const arenaW = diff.isBossLevel ? 780 : 240;
    const finalPlat = {
      x: curX + 85,
      y: curY,
      w: arenaW,
      h: 40,
      type: "static",
      friction: world.surfaceFriction
    };
    anchors.push({ x: curX + 42, y: curY - 140 });
    platforms.push(finalPlat);

    let boss = null;
    if (diff.isBossLevel) {
      boss = new BossEncounter(levelNumber, finalPlat.x, finalPlat.y);
      switches.push({
        id: 99,
        x: finalPlat.x + 120,
        y: finalPlat.y - 10,
        w: 30,
        h: 10,
        active: false,
        latched: false
      });
    }

    const midPlat = platforms[Math.floor(platforms.length * 0.5)];
    const keyItem = { x: midPlat.x + midPlat.w * 0.5, y: midPlat.y - 42, r: 11, collected: false };
    const artifactItem = { x: midPlat.x + midPlat.w * 0.3, y: midPlat.y - 42, r: 12, collected: false };
    const trappedCreature = { x: midPlat.x + midPlat.w * 0.7, y: midPlat.y - 32, w: 26, h: 26, rescued: false };

    const exitPortal = {
      x: finalPlat.x + finalPlat.w - 75,
      y: finalPlat.y - 74,
      w: 44,
      h: 74
    };

    const candidate = {
      seed,
      levelNumber,
      world,
      weatherKey,
      difficulty: diff,
      startPos,
      exitPortal,
      platforms,
      anchors,
      stars,
      props,
      switches,
      gates,
      beacons,
      enemies,
      plants,
      hazards,
      keyItem,
      artifactItem,
      trappedCreature,
      boss
    };

    candidate.fingerprint = LevelGenerator.computeFingerprint(candidate);
    return candidate;
  }

  static computeFingerprint(level) {
    let h1 = 0x811c9dc5;
    let h2 = 0x811c9dc5;
    const feed = (val) => {
      h1 ^= (val & 0xff);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= ((val >>> 8) & 0xff);
      h2 = Math.imul(h2, 0x01000193) >>> 0;
    };

    for (let i = 0; i < level.platforms.length; i++) {
      const p = level.platforms[i];
      feed(Math.round(p.x / 32));
      feed(Math.round(p.y / 24));
      feed(Math.round(p.w / 24));
      feed(p.type === "moving" ? 7 : (p.type === "collapsing" ? 13 : 3));
    }
    for (const a of level.anchors) {
      feed(Math.round(a.x / 32));
      feed(Math.round(a.y / 24));
    }
    return `0x${h1.toString(16).toUpperCase().padStart(8, "0")}${h2.toString(16).toUpperCase().padStart(8, "0")}`;
  }
}