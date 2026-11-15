const STORAGE_KEY = "STARBOUND_GAMERKIE_SAVE_V2";
const DB_NAME = "StarboundGamerKieDB";
const STORE_NAME = "ProfileStore";

export class SaveSystem {
  constructor() {
    this.data = this.getDefaultData();
    this.loadSync();
    this.initIndexedDB();
  }

  getDefaultData() {
    return {
      currentLevel: 1,
      highestLevel: 1,
      completedLevels: {},
      totalStars: 0,
      unlockedWorlds: ["dark_forest"],
      fingerprints: [],
      achievements: [],
      lastWorldId: null,
      settings: {
        music: true,
        sfx: true,
        musicVol: 70,
        sfxVol: 85,
        horror: true,
        touchAlways: false
      }
    };
  }

  loadSync() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = {
          ...this.getDefaultData(),
          ...parsed,
          settings: { ...this.getDefaultData().settings, ...(parsed.settings |

| {}) }
        };
      }
    } catch (_) {
      this.data = this.getDefaultData();
    }
  }

  saveSync() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.saveToIndexedDB();
    } catch (_) {}
  }

  initIndexedDB() {
    if (typeof indexedDB === "undefined") return;
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
      };
    } catch (_) {}
  }

  saveToIndexedDB() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(this.data, "profile");
    } catch (_) {}
  }

  recordLevelCompletion(levelNumber, starsEarned, worldId, fingerprint) {
    const prevStars = this.data.completedLevels[levelNumber] |

| 0;
    if (starsEarned > prevStars) {
      this.data.totalStars += (starsEarned - prevStars);
      this.data.completedLevels[levelNumber] = starsEarned;
    }
    if (!this.data.unlockedWorlds.includes(worldId)) {
      this.data.unlockedWorlds.push(worldId);
    }
    if (fingerprint && !this.data.fingerprints.includes(fingerprint)) {
      this.data.fingerprints.push(fingerprint);
      if (this.data.fingerprints.length > 2000) {
        this.data.fingerprints.shift();
      }
    }
    this.data.lastWorldId = worldId;
    this.data.currentLevel = levelNumber + 1;
    this.data.highestLevel = Math.max(this.data.highestLevel, this.data.currentLevel);
    this.saveSync();
  }

  resetJourneyPreservingFingerprints() {
    const preservedFingerprints = [...this.data.fingerprints];
    const preservedSettings = { ...this.data.settings };
    this.data = this.getDefaultData();
    this.data.fingerprints = preservedFingerprints;
    this.data.settings = preservedSettings;
    this.saveSync();
  }
}