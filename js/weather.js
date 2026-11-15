export const WEATHER_CATALOG = {
  sunny: { name: "Sunny Daytime", windX: 0, frictionMult: 1.0, visibilityRadius: 9999, isNight: false, particleType: "pollen" },
  sunset: { name: "Crimson Sunset", windX: 18, frictionMult: 1.0, visibilityRadius: 9999, isNight: false, skyOverrideTop: "#2b0f26", skyOverrideBottom: "#9e3d22", particleType: "embers" },
  night: { name: "Dark Nighttime", windX: 10, frictionMult: 0.95, visibilityRadius: 185, isNight: true, particleType: "fireflies" },
  moonlit: { name: "Moonlit Night", windX: 15, frictionMult: 0.98, visibilityRadius: 310, isNight: true, particleType: "fireflies" },
  rain: { name: "Heavy Rain", windX: -45, frictionMult: 0.48, visibilityRadius: 420, isNight: false, particleType: "rain" },
  thunderstorm: { name: "Thunderstorm", windX: -115, frictionMult: 0.42, visibilityRadius: 230, isNight: true, hasLightning: true, particleType: "rain" },
  fog: { name: "Dense Fog", windX: 12, frictionMult: 0.88, visibilityRadius: 210, isNight: false, fogDensity: 0.48, particleType: "mist" },
  snow: { name: "Snowfall", windX: 35, frictionMult: 0.32, visibilityRadius: 460, isNight: false, particleType: "snow" },
  blizzard: { name: "Whiteout Blizzard", windX: -195, frictionMult: 0.20, visibilityRadius: 190, isNight: false, fogDensity: 0.55, particleType: "snow" },
  sandstorm: { name: "Raging Sandstorm", windX: 180, frictionMult: 0.72, visibilityRadius: 205, isNight: false, fogDensity: 0.50, particleType: "sand" },
  wind: { name: "Gale Force Wind", windX: 210, frictionMult: 0.95, visibilityRadius: 9999, isNight: false, particleType: "leaves" },
  dust_storm: { name: "Choking Dust Storm", windX: -145, frictionMult: 0.80, visibilityRadius: 240, isNight: false, fogDensity: 0.42, particleType: "sand" },
  volcanic_ash: { name: "Volcanic Ashfall", windX: 40, frictionMult: 0.85, visibilityRadius: 290, isNight: true, particleType: "embers" },
  meteor_shower: { name: "Meteor Shower", windX: 25, frictionMult: 0.95, visibilityRadius: 400, isNight: true, spawnsMeteors: true, particleType: "embers" },
  alien_atmos: { name: "Strange Alien Ionosphere", windX: 60, frictionMult: 0.88, visibilityRadius: 280, isNight: true, particleType: "spores" }
};

export class WeatherSystem {
  constructor() {
    this.currentKey = "sunny";
    this.state = { ...WEATHER_CATALOG.sunny, lightningFlash: 0, lightningTimer: 5 };
    this.particles = [];
    this.meteors = [];
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 110; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        size: 1.5 + Math.random() * 3.5,
        speedX: (Math.random() - 0.5) * 30,
        speedY: 40 + Math.random() * 180
      });
    }
  }

  setWeather(key, severity = 1.0) {
    const template = WEATHER_CATALOG[key] |

| WEATHER_CATALOG.sunny;
    this.currentKey = key;
    this.state = {
      ...template,
      windX: template.windX * (0.65 + severity * 0.45),
      lightningFlash: 0,
      lightningTimer: 3 + Math.random() * 5
    };
    this.meteors = [];
  }

  update(dt, physics, camera, player, audio) {
    physics.windForce.x = this.state.windX;
    physics.globalFrictionMultiplier = this.state.frictionMult;

    if (this.state.hasLightning) {
      this.state.lightningTimer -= dt;
      if (this.state.lightningTimer <= 0) {
        this.state.lightningFlash = 1.0;
        this.state.lightningTimer = 4.0 + Math.random() * 6.5;
        if (audio) audio.playSfx("thunder");
      }
    }
    if (this.state.lightningFlash > 0) {
      this.state.lightningFlash = Math.max(0, this.state.lightningFlash - dt * 2.6);
    }

    if (this.state.spawnsMeteors && Math.random() < dt * 0.55) {
      this.meteors.push({
        x: camera.x + Math.random() * 1400,
        y: camera.y - 60,
        vx: -140 + Math.random() * 80,
        vy: 340 + Math.random() * 140,
        r: 12,
        active: true
      });
    }

    for (const m of this.meteors) {
      if (!m.active) continue;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (Math.hypot((player.x + player.w * 0.5) - m.x, (player.y + player.h * 0.5) - m.y) < m.r + 16) {
        player.takeDamage(22, m.x);
        m.active = false;
      }
      if (m.y > camera.y + 850) m.active = false;
    }
    this.meteors = this.meteors.filter(m => m.active);

    const pType = this.state.particleType;
    for (const p of this.particles) {
      if (pType === "rain") {
        p.x += (this.state.windX * 0.9) * dt;
        p.y += (520 + p.speedY) * dt;
      } else if (pType === "snow") {
        p.x += (this.state.windX * 0.7 + Math.sin(p.y * 0.04) * 30) * dt;
        p.y += (95 + p.speedY * 0.4) * dt;
      } else if (pType === "sand" |

| pType === "leaves") {
        p.x += (this.state.windX * 1.4 + 160) * dt;
        p.y += Math.sin(p.x * 0.03) * 35 * dt;
      } else {
        p.x += (p.speedX + this.state.windX * 0.2) * dt;
        p.y -= 22 * dt;
      }

      if (p.x > 1280) p.x -= 1280;
      if (p.x < 0) p.x += 1280;
      if (p.y > 720) p.y -= 720;
      if (p.y < 0) p.y += 720;
    }
  }

  render(ctx, camera, canvasW, canvasH) {
    const pType = this.state.particleType;
    ctx.save();

    if (pType === "rain") {
      ctx.strokeStyle = "rgba(175, 215, 255, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const p of this.particles) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + this.state.windX * 0.03, p.y + 16);
      }
      ctx.stroke();
    } else if (pType === "snow") {
      ctx.fillStyle = "rgba(240, 248, 255, 0.8)";
      ctx.beginPath();
      for (const p of this.particles) {
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (pType === "sand") {
      ctx.fillStyle = "rgba(235, 185, 110, 0.48)";
      for (const p of this.particles) {
        ctx.fillRect(p.x, p.y, p.size * 3, 2);
      }
    } else if (pType === "embers") {
      ctx.fillStyle = "rgba(255, 110, 30, 0.8)";
      for (const p of this.particles) {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    } else {
      ctx.fillStyle = "rgba(120, 255, 210, 0.55)";
      for (const p of this.particles) {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }

    for (const m of this.meteors) {
      const mx = m.x - camera.x;
      const my = m.y - camera.y;
      ctx.fillStyle = "#ff4500";
      ctx.shadowColor = "#ff9900";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.state.fogDensity) {
      ctx.fillStyle = `rgba(180, 195, 210, ${this.state.fogDensity * 0.45})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    ctx.restore();
  }
}