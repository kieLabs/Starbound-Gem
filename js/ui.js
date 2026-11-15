import { WORLD_CATALOG } from "./world-generator.js";

export class UIManager {
  constructor(game, saveSystem, audio) {
    this.game = game;
    this.saveSystem = saveSystem;
    this.audio = audio;
    this.bindMenuButtons();
    this.refreshMainMenuStats();
  }

  hideAllScreens() {
    document.querySelectorAll(".menu-screen").forEach(el => el.classList.add("hidden"));
  }

  showScreen(id) {
    this.hideAllScreens();
    const target = document.getElementById(id);
    if (target) target.classList.remove("hidden");
  }

  refreshMainMenuStats() {
    const d = this.saveSystem.data;
    document.getElementById("menu-stat-level").textContent = `Saved Level: ${d.currentLevel}`;
    document.getElementById("menu-stat-stars").textContent = `Total Stars: &#9733; ${d.totalStars}`;
    document.getElementById("menu-stat-unique").textContent = `Unique Worlds Verified: ${d.fingerprints.length}`;
  }

  updateHUD(levelData, player, weather, objectives) {
    document.getElementById("hud-level").textContent = levelData.levelNumber;
    document.getElementById("hud-world").textContent = levelData.world.name.toUpperCase();
    document.getElementById("hud-weather").textContent = weather.state.name.toUpperCase();
    document.getElementById("hud-objective").textContent = objectives.getSummaryText();

    const collected = levelData.stars.filter(s => s.collected).length;
    document.getElementById("hud-stars").textContent = `&#9733; ${collected} / ${levelData.stars.length}`;
    document.getElementById("hud-health-fill").style.width = `${(player.health / player.maxHealth) * 100}%`;

    const bossBox = document.getElementById("hud-boss-bar");
    if (levelData.boss && !levelData.boss.defeated) {
      bossBox.classList.remove("hidden");
      const pct = Math.max(0, Math.round((levelData.boss.hp / levelData.boss.maxHp) * 100));
      document.getElementById("hud-boss-name").textContent = levelData.boss.name;
      document.getElementById("hud-boss-hp-text").textContent = `${pct}%`;
      document.getElementById("hud-boss-fill").style.width = `${pct}%`;
    } else {
      bossBox.classList.add("hidden");
    }
  }

  showEventBanner(text) {
    const banner = document.getElementById("event-banner");
    if (!banner) return;
    banner.textContent = `&#9889; ${text}`;
    banner.classList.remove("hidden");
    clearTimeout(this._bannerTimeout);
    this._bannerTimeout = setTimeout(() => banner.classList.add("hidden"), 3600);
  }

  populateWorldMap() {
    const grid = document.getElementById("world-map-grid");
    grid.innerHTML = "";
    const unlocked = this.saveSystem.data.unlockedWorlds;
    for (const w of WORLD_CATALOG) {
      const isUnlocked = unlocked.includes(w.id);
      const card = document.createElement("div");
      card.className = `world-card ${isUnlocked ? "unlocked" : ""}`;
      card.innerHTML = `
        <h4>${isUnlocked ? "🌍 " + w.name : "🔒 " + w.name}</h4>
        <p>${w.desc}</p>
      `;
      if (isUnlocked) {
        card.addEventListener("click", () => {
          this.saveSystem.data.lastWorldId = null;
          this.game.startLevel(this.saveSystem.data.currentLevel, w.id);
        });
      }
      grid.appendChild(card);
    }
  }

  populateLevelSelect() {
    const grid = document.getElementById("level-select-grid");
    grid.innerHTML = "";
    const maxLvl = Math.max(15, this.saveSystem.data.highestLevel + 5);
    for (let i = 1; i <= maxLvl; i++) {
      const unlocked = i <= this.saveSystem.data.highestLevel;
      const stars = this.saveSystem.data.completedLevels[i] |

| 0;
      const btn = document.createElement("button");
      btn.className = `level-cell ${i === this.saveSystem.data.currentLevel ? "current" : ""}`;
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <span>${unlocked ? i : "🔒"}</span>
        <span class="cell-stars">${"&#9733;".repeat(stars)}${"&#9734;".repeat(3 - stars)}</span>
      `;
      if (unlocked) {
        btn.addEventListener("click", () => this.game.startLevel(i));
      }
      grid.appendChild(btn);
    }
  }

  bindMenuButtons() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => {
        this.audio.ensureContext();
        fn();
      });
    };

    on("btn-continue", () => this.game.startLevel(this.saveSystem.data.currentLevel));
    on("btn-new-journey", () => this.showScreen("menu-confirm-reset"));
    on("btn-confirm-yes", () => {
      this.saveSystem.resetJourneyPreservingFingerprints();
      this.refreshMainMenuStats();
      this.game.startLevel(1);
    });
    on("btn-confirm-no", () => this.showScreen("menu-main"));

    on("btn-world-map", () => {
      this.populateWorldMap();
      this.showScreen("menu-world-map");
    });
    on("btn-close-world-map", () => this.showScreen("menu-main"));

    on("btn-level-select", () => {
      this.populateLevelSelect();
      this.showScreen("menu-level-select");
    });
    on("btn-close-level-select", () => this.showScreen("menu-main"));

    on("btn-settings", () => {
      this.syncSettingsControls();
      this.showScreen("menu-settings");
    });
    on("btn-pause-settings", () => {
      this.syncSettingsControls();
      this.showScreen("menu-settings");
    });
    on("btn-close-settings", () => {
      this.saveSettingsFromControls();
      if (this.game.state === "paused") this.showScreen("menu-pause");
      else this.showScreen("menu-main");
    });

    on("btn-how-to-play", () => this.showScreen("menu-how-to-play"));
    on("btn-close-how-to-play", () => this.showScreen("menu-main"));

    on("btn-hud-pause", () => this.game.togglePause());
    on("btn-resume", () => this.game.togglePause());
    on("btn-restart-level", () => this.game.startLevel(this.game.currentLevelNumber));
    on("btn-pause-main-menu", () => this.game.returnToMainMenu());

    on("btn-next-level", () => this.game.startLevel(this.saveSystem.data.currentLevel));
    on("btn-victory-replay", () => this.game.startLevel(this.game.currentLevelNumber));
    on("btn-victory-menu", () => this.game.returnToMainMenu());

    on("btn-retry", () => this.game.startLevel(this.game.currentLevelNumber));
    on("btn-gameover-menu", () => this.game.returnToMainMenu());

    on("btn-hud-mute", () => {
      const s = this.saveSystem.data.settings;
      s.music = !s.music;
      s.sfx = s.music;
      this.saveSystem.saveSync();
      this.audio.syncVolumes();
      document.getElementById("btn-hud-mute").textContent = s.music ? "🔊" : "🔇";
    });

    on("btn-hud-fullscreen", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    on("btn-run-tests", () => {
      this.game.executeAndDisplayTestSuite();
    });
    on("btn-close-tests", () => this.showScreen("menu-main"));
  }

  syncSettingsControls() {
    const s = this.saveSystem.data.settings;
    document.getElementById("chk-music").checked = s.music;
    document.getElementById("chk-sfx").checked = s.sfx;
    document.getElementById("rng-music-vol").value = s.musicVol;
    document.getElementById("rng-sfx-vol").value = s.sfxVol;
    document.getElementById("chk-horror").checked = s.horror;
    document.getElementById("chk-touch-always").checked = s.touchAlways;
  }

  saveSettingsFromControls() {
    const s = this.saveSystem.data.settings;
    s.music = document.getElementById("chk-music").checked;
    s.sfx = document.getElementById("chk-sfx").checked;
    s.musicVol = Number(document.getElementById("rng-music-vol").value);
    s.sfxVol = Number(document.getElementById("rng-sfx-vol").value);
    s.horror = document.getElementById("chk-horror").checked;
    s.touchAlways = document.getElementById("chk-touch-always").checked;
    this.saveSystem.saveSync();
    this.audio.syncVolumes();
    this.game.updateTouchVisibility();
  }
}