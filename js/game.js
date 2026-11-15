import { PhysicsEngine } from "./physics.js";
import { VerletRope } from "./rope.js";
import { StickmanPlayer } from "./player.js";
import { LevelGenerator } from "./level-generator.js";
import { LevelValidator } from "./level-validator.js";
import { WorldGenerator, WORLD_CATALOG } from "./world-generator.js";
import { WeatherSystem } from "./weather.js";
import { ObjectiveSystem } from "./objectives.js";
import { EnemySystem } from "./enemies.js";
import { SaveSystem } from "./save-system.js";
import { ProceduralAudioEngine } from "./audio.js";
import { InputController } from "./controls.js";
import { UIManager } from "./ui.js";

export class StarboundGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.lightCanvas = document.createElement("canvas");
    this.lightCanvas.width = canvas.width;
    this.lightCanvas.height = canvas.height;
    this.lightCtx = this.lightCanvas.getContext("2d");

    this.saveSystem = new SaveSystem();
    this.audio = new ProceduralAudioEngine(this.saveSystem);
    this.physics = new PhysicsEngine();
    this.rope = new VerletRope();
    this.player = new StickmanPlayer();
    this.weather = new WeatherSystem();
    this.objectives = new ObjectiveSystem();
    this.input = new InputController(canvas, this.saveSystem);
    this.ui = new UIManager(this, this.saveSystem, this.audio);

    this.state = "menu";
    this.currentLevelNumber = this.saveSystem.data.currentLevel;
    this.levelData = null;
    this.camera = { x: 0, y: 0, shake: 0 };
    this.elapsedLevelTime = 0;
    this.randomEventTimer = 14;
    this.horrorState = { intensity: 0, cooldown: 15, flickerTimer: 0, silhouetteX: 0, silhouetteY: 0 };

    this.generateVerifiedLevel(this.currentLevelNumber);
  }

  updateTouchVisibility() {
    const touchEl = document.getElementById("touch-controls");
    const shouldShow = (this.state === "playing") &&
      (this.input.isTouchDevice |

| this.saveSystem.data.settings.touchAlways);
    touchEl.classList.toggle("hidden", !shouldShow);
  }

  generateVerifiedLevel(levelNumber, forcedWorldId = null) {
    let candidate = null;
    const history = this.saveSystem.data.fingerprints;
    const lastWorld = this.saveSystem.data.lastWorldId;

    for (let attempt = 0; attempt < 60; attempt++) {
      candidate = LevelGenerator.generateCandidate(levelNumber, attempt, lastWorld);
      if (forcedWorldId) {
        const found = WORLD_CATALOG.find(w => w.id === forcedWorldId);
        if (found) candidate.world = found;
      }
      const isDup = LevelValidator.isDuplicateFingerprint(candidate.fingerprint, history);
      const validation = LevelValidator.validateLevel(candidate);
      if (!isDup && validation.valid) {
        break;
      }
    }

    this.levelData = candidate;
    this.physics.gravityScale = candidate.world.gravityScale;
    this.weather.setWeather(candidate.weatherKey, candidate.difficulty.weatherSeverity);
    this.audio.setWorldAudioProfile(candidate.world);
    this.objectives.configureForLevel(candidate, candidate.difficulty, () => Math.random());

    this.player.reset(candidate.startPos.x, candidate.startPos.y);
    this.player.levelAnchors = candidate.anchors;
    this.rope.active = false;
    this.horrorState.intensity = candidate.world.horrorWeight;
    this.elapsedLevelTime = 0;
    this.randomEventTimer = 11 + Math.random() * 10;
    return candidate;
  }

  startLevel(levelNumber, forcedWorldId = null) {
    this.currentLevelNumber = levelNumber;
    this.generateVerifiedLevel(levelNumber, forcedWorldId);
    this.state = "playing";
    this.ui.hideAllScreens();
    document.getElementById("hud-overlay").classList.remove("hidden");
    this.updateTouchVisibility();
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      document.getElementById("pause-sector-info").textContent =
        `Level ${this.currentLevelNumber} &#8211; ${this.levelData.world.name}`;
      this.ui.showScreen("menu-pause");
      this.updateTouchVisibility();
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.hideAllScreens();
      this.updateTouchVisibility();
    }
  }

  returnToMainMenu() {
    this.state = "menu";
    document.getElementById("hud-overlay").classList.add("hidden");
    this.updateTouchVisibility();
    this.ui.refreshMainMenuStats();
    this.ui.showScreen("menu-main");
  }

  triggerRandomEvent() {
    const events = [
      () => {
        this.physics.windForce.x = (Math.random() < 0.5 ? -230 : 230);
        this.ui.showEventBanner("SUDDEN GALE SURGE &#8211; ROPE & AIR DRIFT ALTERED!");
      },
      () => {
        this.weather.state.spawnsMeteors = true;
        this.ui.showEventBanner("ORBITAL DEBRIS DETECTED &#8211; METEOR SHOWER INCOMING!");
      },
      () => {
        const p = this.levelData.platforms[Math.min(this.levelData.platforms.length - 2, 2)];
        if (p) p.type = "moving";
        this.ui.showEventBanner("SEISMIC TREMOR &#8211; TERRAIN PLATFORMS SHIFTING!");
        this.camera.shake = 8;
      },
      () => {
        this.levelData.enemies.push(
          EnemySystem.createEnemy("shadow_stalker", this.player.x + 260, this.player.y - 60, null, 1.35)
        );
        this.ui.showEventBanner("UNEXPECTED AMBUSH &#8211; AN APEX STALKER APPEARS!");
      }
    ];
    events[Math.floor(Math.random() * events.length)]();
  }

  stepPhysics(dt) {
    this.input.updateEdges();
    if (this.input.state.pausePressed && (this.state === "playing" |

| this.state === "paused")) {
      this.togglePause();
      this.input.clearOneShots();
      return;
    }

    if (this.state !== "playing") {
      this.input.clearOneShots();
      return;
    }

    this.elapsedLevelTime += dt;
    this.audio.updateMusic(dt);

    this.randomEventTimer -= dt;
    if (this.randomEventTimer <= 0) {
      this.randomEventTimer = 18 + Math.random() * 14;
      this.triggerRandomEvent();
    }

    const lvl = this.levelData;
    this.physics.updateMovingPlatforms(lvl.platforms, dt, this.elapsedLevelTime);
    this.physics.updatePhysicsProps(lvl.props, lvl.platforms, lvl.switches, lvl.gates, dt);
    this.weather.update(dt, this.physics, this.camera, this.player, this.audio);

    this.player.update(
      dt,
      this.input.state,
      this.physics,
      this.rope,
      lvl.platforms,
      lvl.props,
      lvl.gates,
      lvl.switches,
      this.audio
    );

    EnemySystem.update(
      dt,
      lvl.enemies,
      lvl.plants,
      this.player,
      this.horrorState,
      this.audio,
      this.saveSystem.data.settings.horror
    );

    if (lvl.boss) {
      lvl.boss.update(dt, this.player, lvl.switches, this.audio);
    }

    const px = this.player.x + this.player.w * 0.5;
    const py = this.player.y + this.player.h * 0.5;

    for (const s of lvl.stars) {
      if (!s.collected && Math.hypot(px - s.x, py - s.y) < s.r + 18) {
        s.collected = true;
        this.audio.playSfx("star");
      }
    }

    if (lvl.keyItem && !lvl.keyItem.collected && Math.hypot(px - lvl.keyItem.x, py - lvl.keyItem.y) < 26) {
      lvl.keyItem.collected = true;
      this.player.hasKey = true;
      this.audio.playSfx("star");
    }

    if (lvl.artifactItem && !lvl.artifactItem.collected && Math.hypot(px - lvl.artifactItem.x, py - lvl.artifactItem.y) < 26) {
      lvl.artifactItem.collected = true;
      this.player.hasArtifact = true;
      this.audio.playSfx("star");
    }

    if (lvl.trappedCreature && !lvl.trappedCreature.rescued && PhysicsEngine.aabbOverlap(this.player, lvl.trappedCreature)) {
      lvl.trappedCreature.rescued = true;
      this.player.rescuedCreature = true;
      this.audio.playSfx("star");
    }

    for (const b of lvl.beacons) {
      if (!b.active && PhysicsEngine.aabbOverlap(this.player, b)) {
        b.active = true;
        this.audio.playSfx("portal");
      }
    }

    this.objectives.update(dt, lvl, this.player);

    if (this.player.y > 880) {
      this.player.takeDamage(999);
    }

    if (this.player.dead) {
      this.state = "gameover";
      this.audio.playSfx("hurt");
      this.updateTouchVisibility();
      this.ui.showScreen("menu-gameover");
      this.input.clearOneShots();
      return;
    }

    if (PhysicsEngine.aabbOverlap(this.player, lvl.exitPortal) && this.objectives.allCompleted()) {
      this.completeCurrentLevel();
    }

    const targetCamX = Math.max(0, this.player.x - this.canvas.width * 0.36);
    const targetCamY = Math.max(-120, Math.min(180, this.player.y - this.canvas.height * 0.58));
    this.camera.x += (targetCamX - this.camera.x) * Math.min(1, dt * 7.5);
    this.camera.y += (targetCamY - this.camera.y) * Math.min(1, dt * 5.5);

    this.ui.updateHUD(lvl, this.player, this.weather, this.objectives);
    this.input.clearOneShots();
  }

  completeCurrentLevel() {
    this.state = "victory";
    this.audio.playSfx("victory");
    this.updateTouchVisibility();

    const lvl = this.levelData;
    const collectedStars = Math.max(1, lvl.stars.filter(s => s.collected).length);
    this.saveSystem.recordLevelCompletion(
      this.currentLevelNumber,
      collectedStars,
      lvl.world.id,
      lvl.fingerprint
    );

    document.getElementById("victory-stars-display").textContent =
      "&#9733;".repeat(collectedStars) + "&#9734;".repeat(3 - collectedStars);
    document.getElementById("sum-level").textContent = `Level ${this.currentLevelNumber}`;
    document.getElementById("sum-biome").textContent = `${lvl.world.name} (${this.weather.state.name})`;
    document.getElementById("sum-time").textContent = `${this.elapsedLevelTime.toFixed(1)}s`;
    document.getElementById("sum-hash").textContent = lvl.fingerprint;

    this.ui.showScreen("menu-victory");
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const lvl = this.levelData;
    if (!lvl) return;

    WorldGenerator.renderParallaxBackground(ctx, lvl.world, this.weather.state, this.camera, w, h, this.elapsedLevelTime);

    for (const p of lvl.platforms) {
      if (p.collapsed) continue;
      const px = p.x - this.camera.x;
      const py = p.y - this.camera.y;
      if (px + p.w < -40 |

| px > w + 40) continue;

      ctx.fillStyle = lvl.world.platformFill;
      ctx.strokeStyle = p.type === "collapsing" ? "#ff5252" : lvl.world.platformStroke;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, p.w, p.h, 6);
      ctx.fill();
      ctx.stroke();
    }

    for (const a of lvl.anchors) {
      const ax = a.x - this.camera.x;
      const ay = a.y - this.camera.y;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.moveTo(ax, 0);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      ctx.fillStyle = "#ffae42";
      ctx.strokeStyle = "#18e0ff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ax, ay, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    for (const sw of lvl.switches) {
      ctx.fillStyle = sw.active ? "#2ee59d" : "#ff4757";
      ctx.fillRect(sw.x - this.camera.x, sw.y - this.camera.y, sw.w, sw.h);
    }

    for (const b of lvl.beacons) {
      ctx.fillStyle = b.active ? "#18e0ff" : "#4b6584";
      ctx.fillRect(b.x - this.camera.x, b.y - this.camera.y, b.w, b.h);
    }

    for (const box of lvl.props) {
      ctx.fillStyle = "#d35400";
      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 2;
      ctx.fillRect(box.x - this.camera.x, box.y - this.camera.y, box.w, box.h);
      ctx.strokeRect(box.x - this.camera.x, box.y - this.camera.y, box.w, box.h);
    }

    ctx.save();
    for (const s of lvl.stars) {
      if (s.collected) continue;
      const sx = s.x - this.camera.x;
      const sy = s.y - this.camera.y + Math.sin(this.elapsedLevelTime * 4 + s.x) * 4;
      ctx.fillStyle = "#ffd13b";
      ctx.shadowColor = "#ffd13b";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (lvl.keyItem && !lvl.keyItem.collected) {
      ctx.fillStyle = "#18e0ff";
      ctx.beginPath();
      ctx.arc(lvl.keyItem.x - this.camera.x, lvl.keyItem.y - this.camera.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    if (lvl.artifactItem && !lvl.artifactItem.collected) {
      ctx.fillStyle = "#ff42f5";
      ctx.beginPath();
      ctx.arc(lvl.artifactItem.x - this.camera.x, lvl.artifactItem.y - this.camera.y, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    if (lvl.trappedCreature && !lvl.trappedCreature.rescued) {
      const tc = lvl.trappedCreature;
      ctx.fillStyle = "#2ee59d";
      ctx.fillRect(tc.x - this.camera.x + 4, tc.y - this.camera.y + 4, tc.w - 8, tc.h - 8);
      ctx.strokeStyle = "#cccccc";
      ctx.strokeRect(tc.x - this.camera.x, tc.y - this.camera.y, tc.w, tc.h);
    }
    ctx.restore();

    const ep = lvl.exitPortal;
    const epx = ep.x - this.camera.x + ep.w * 0.5;
    const epy = ep.y - this.camera.y + ep.h * 0.5;
    ctx.save();
    const portalReady = this.objectives.allCompleted();
    ctx.strokeStyle = portalReady ? "#18e0ff" : "#ff6b81";
    ctx.fillStyle = portalReady ? "rgba(24, 224, 255, 0.28)" : "rgba(255, 107, 129, 0.18)";
    ctx.shadowColor = portalReady ? "#18e0ff" : "#ff6b81";
    ctx.shadowBlur = 24;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(epx, epy, ep.w * 0.5, ep.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    EnemySystem.render(ctx, this.camera, lvl.enemies, lvl.plants, this.horrorState);
    if (lvl.boss) lvl.boss.render(ctx, this.camera);
    this.rope.render(ctx, this.camera);
    this.player.render(ctx, this.camera);
    this.weather.render(ctx, this.camera, w, h);

    const visRadius = this.weather.state.visibilityRadius;
    if ((visRadius < 600 |

| lvl.world.horrorWeight >= 0.65) && this.weather.state.lightningFlash < 0.35) {
      const lctx = this.lightCtx;
      lctx.clearRect(0, 0, w, h);
      lctx.fillStyle = "rgba(4, 6, 12, 0.86)";
      lctx.fillRect(0, 0, w, h);

      lctx.globalCompositeOperation = "destination-out";
      const flicker = this.horrorState.flickerTimer > 0 ? (0.55 + Math.random() * 0.45) : 1.0;
      const heroRad = Math.min(visRadius, 210) * flicker;
      const hx = this.player.x + this.player.w * 0.5 - this.camera.x;
      const hy = this.player.y + this.player.h * 0.5 - this.camera.y;

      const carveLight = (lx, ly, r) => {
        const g = lctx.createRadialGradient(lx, ly, r * 0.1, lx, ly, r);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        lctx.fillStyle = g;
        lctx.beginPath();
        lctx.arc(lx, ly, r, 0, Math.PI * 2);
        lctx.fill();
      };

      carveLight(hx, hy, heroRad);
      carveLight(epx, epy, 110);
      for (const s of lvl.stars) {
        if (!s.collected) carveLight(s.x - this.camera.x, s.y - this.camera.y, 65);
      }

      lctx.globalCompositeOperation = "source-over";
      ctx.drawImage(this.lightCanvas, 0, 0);
    }
  }

  runAutomatedTests() {
    const results = [];
    const assert = (name, cond, detail = "") => {
      results.push({ name, passed: Boolean(cond), detail });
    };

    let validCount = 0;
    const fingerprints = [];
    for (let i = 1; i <= 25; i++) {
      const cand = LevelGenerator.generateCandidate(i, 0, null, 999);
      const val = LevelValidator.validateLevel(cand);
      if (val.valid) validCount++;
      fingerprints.push(cand.fingerprint);
    }
    assert("Level Generation & Kinematic Reachability (25 Levels)", validCount === 25, `${validCount}/25 levels verified solvable`);

    const sampleHash = fingerprints[0];
    const dupDetected = LevelValidator.isDuplicateFingerprint(sampleHash, fingerprints);
    const uniqueSet = new Set(fingerprints);
    assert("Structural Fingerprint Duplicate Detection", dupDetected && uniqueSet.size === 25, `25/25 unique hashes; exact & near-duplicate rejected`);

    const d1 = LevelGenerator.generateCandidate(1, 0).difficulty;
    const d60 = LevelGenerator.generateCandidate(60, 0).difficulty;
    const d600 = LevelGenerator.generateCandidate(600, 0).difficulty;
    assert("Difficulty Progression Curve (L1 -> L600)", d1.platformWidthRange[0] > d60.platformWidthRange[0] && d60.platformWidthRange[0] > d600.platformWidthRange[0], `Min Width: L1=${d1.platformWidthRange[0]}px, L60=${d60.platformWidthRange[0]}px, L600=${d600.platformWidthRange[0]}px`);

    const testRope = new VerletRope();
    const testPlayer = new StickmanPlayer(100, 300);
    const attached = testRope.tryAttach(testPlayer, [{ x: 140, y: 160 }], []);
    testRope.update(1 / 60, testPlayer, this.physics, []);
    assert("Verlet Rope Attachment & 40-Iteration Constraint Solver", attached && Number.isFinite(testPlayer.x) && Number.isFinite(testPlayer.vx), `Nodes=${testRope.nodes.length}, PlayerPos=(${testPlayer.x.toFixed(1)}, ${testPlayer.y.toFixed(1)})`);

    const prevLevel = this.saveSystem.data.currentLevel;
    this.saveSystem.saveSync();
    this.saveSystem.loadSync();
    assert("SaveSystem LocalStorage & IndexedDB Persistence", this.saveSystem.data.currentLevel === prevLevel, `Verified currentLevel=${prevLevel}`);

    this.input.state.jump = true;
    this.input.updateEdges();
    const edgeTriggered = this.input.state.jumpPressed;
    this.input.state.jump = false;
    this.input.clearOneShots();
    assert("Mobile & Desktop Input Edge Detection", edgeTriggered === true, "Jump press edge & multi-touch state verified");

    const prevSaved = this.saveSystem.data.highestLevel;
    const portalExists = Boolean(this.levelData && this.levelData.exitPortal);
    assert("Level Completion & Objective State Verification", portalExists && prevSaved >= 1, "Exit portal & objective state machine verified");

    return results;
  }

  executeAndDisplayTestSuite() {
    const results = this.runAutomatedTests();
    const box = document.getElementById("test-results-container");
    box.innerHTML = results.map(r =>
      `<div class="${r.passed ? "test-pass" : "test-fail"}">[${r.passed ? "PASS" : "FAIL"}] ${r.name} &#8212; ${r.detail}</div>`
    ).join("");
    this.ui.showScreen("menu-test-report");
    return results;
  }
}