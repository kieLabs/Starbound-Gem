export class ProceduralAudioEngine {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.stepTimer = 0;
    this.stepIndex = 0;
    this.currentScale = [220, 261.63, 293.66, 329.63, 392.0];
    this.isHorror = false;
  }

  ensureContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext |

| window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);
        this.syncVolumes();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  syncVolumes() {
    if (!this.ctx) return;
    const s = this.saveSystem.data.settings;
    this.musicGain.gain.value = s.music ? (s.musicVol / 100) * 0.18 : 0;
    this.sfxGain.gain.value = s.sfx ? (s.sfxVol / 100) * 0.35 : 0;
  }

  setWorldAudioProfile(world) {
    this.currentScale = world.musicScale |

| [220, 261.63, 293.66, 329.63, 392.0];
    this.isHorror = world.horrorWeight >= 0.65;
  }

  updateMusic(dt) {
    if (!this.ctx |

| !this.saveSystem.data.settings.music) return;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.isHorror ? 0.62 : 0.42;
      const freq = this.currentScale[this.stepIndex % this.currentScale.length];
      this.stepIndex = (this.stepIndex + 1 + (Math.random() < 0.3 ? 1 : 0)) % this.currentScale.length;
      this.playTone(freq, this.isHorror ? "sawtooth" : "triangle", 0.36, this.musicGain);
    }
  }

  playTone(freq, type, duration, destNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(0.4, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(env);
    env.connect(destNode);
    osc.start(now);
    osc.stop(now + duration);
  }

  playSfx(name) {
    this.ensureContext();
    if (!this.ctx |

| !this.saveSystem.data.settings.sfx) return;

    if (name === "jump") {
      this.playSweep(190, 440, "sine", 0.16);
    } else if (name === "rope") {
      this.playSweep(320, 680, "triangle", 0.12);
    } else if (name === "star") {
      this.playSweep(523.25, 1046.5, "sine", 0.24);
    } else if (name === "land") {
      this.playSweep(120, 55, "triangle", 0.09);
    } else if (name === "hurt") {
      this.playSweep(210, 75, "sawtooth", 0.28);
    } else if (name === "horror") {
      this.playSweep(58, 195, "sawtooth", 0.55);
    } else if (name === "thunder") {
      this.playSweep(95, 38, "sawtooth", 0.65);
    } else if (name === "portal" |

| name === "victory") {
      this.playSweep(330, 880, "sine", 0.45);
    }
  }

  playSweep(fStart, fEnd, type, duration) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), now + duration);
    env.gain.setValueAtTime(0.45, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }
}
