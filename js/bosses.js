import { PhysicsEngine } from "./physics.js";

const BOSS_ARCHETYPES = [
  { name: "ARACHNE BROODMOTHER", color: "#8e44ad", hp: 300 },
  { name: "THE HOLLOW WARDEN", color: "#576574", hp: 360 },
  { name: "XENO-LEVIATHAN", color: "#00d2d3", hp: 420 },
  { name: "CRYO-COLOSSUS", color: "#54a0ff", hp: 480 },
  { name: "DUNE DEVOURER", color: "#f39c12", hp: 540 },
  { name: "IGNIS CORE-TITAN", color: "#ee5253", hp: 600 },
  { name: "CHRONOS PRIME", color: "#feca57", hp: 700 }
];

export class BossEncounter {
  constructor(levelNumber, arenaX, arenaY) {
    const template = BOSS_ARCHETYPES[Math.floor((levelNumber / 10 - 1)) % BOSS_ARCHETYPES.length] |

| BOSS_ARCHETYPES[0];
    this.name = template.name;
    this.color = template.color;
    this.maxHp = template.hp;
    this.hp = template.hp;
    this.x = arenaX + 420;
    this.y = arenaY - 90;
    this.w = 76;
    this.h = 76;
    this.vx = 135;
    this.vy = 0;
    this.minX = arenaX + 80;
    this.maxX = arenaX + 680;
    this.baseY = arenaY - 90;
    this.attackTimer = 2.6;
    this.vulnerableTimer = 0;
    this.projectiles = [];
    this.defeated = false;
  }

  update(dt, player, switches, audio) {
    if (this.defeated) return;

    if (this.vulnerableTimer > 0) {
      this.vulnerableTimer -= dt;
    } else {
      this.x += this.vx * dt;
      if (this.x <= this.minX) { this.x = this.minX; this.vx = Math.abs(this.vx); }
      if (this.x >= this.maxX) { this.x = this.maxX; this.vx = -Math.abs(this.vx); }
      this.y = this.baseY + Math.sin(performance.now() * 0.004) * 18;
    }

    for (const sw of switches) {
      if (sw.justActivated) {
        this.hp = Math.max(0, this.hp - this.maxHp * 0.35);
        this.vulnerableTimer = 2.2;
        sw.active = false;
        if (audio) audio.playSfx("thunder");
      }
    }

    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.attackTimer = 2.1;
      const angle = Math.atan2((player.y + 20) - (this.y + 38), (player.x + 12) - (this.x + 38));
      this.projectiles.push({
        x: this.x + 38,
        y: this.y + 38,
        vx: Math.cos(angle) * 260,
        vy: Math.sin(angle) * 260,
        r: 9,
        life: 4.0
      });
    }

    for (const proj of this.projectiles) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;
      if (PhysicsEngine.circleRectOverlap(proj.x, proj.y, proj.r, player)) {
        player.takeDamage(20, proj.x);
        proj.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);

    if (PhysicsEngine.aabbOverlap(player, this)) {
      if (player.vy > 90 && player.y + player.h - player.vy * dt <= this.y + 24) {
        this.hp = Math.max(0, this.hp - this.maxHp * 0.26);
        player.vy = -480;
        this.vulnerableTimer = 1.2;
        if (audio) audio.playSfx("portal");
      } else {
        player.takeDamage(24, this.x + this.w * 0.5);
      }
    }

    if (this.hp <= 0) {
      this.defeated = true;
      this.projectiles = [];
      if (audio) audio.playSfx("victory");
    }
  }

  render(ctx, camera) {
    if (this.defeated) return;
    const x = this.x - camera.x;
    const y = this.y - camera.y;

    ctx.save();
    ctx.fillStyle = this.vulnerableTimer > 0 ? "#ffffff" : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.roundRect(x, y, this.w, this.h, 16);
    ctx.fill();

    ctx.fillStyle = "#18e0ff";
    ctx.fillRect(x + 18, y - 6, this.w - 36, 8);

    ctx.fillStyle = "#111111";
    ctx.fillRect(x + 16, y + 24, 14, 14);
    ctx.fillRect(x + this.w - 30, y + 24, 14, 14);

    for (const proj of this.projectiles) {
      ctx.fillStyle = "#ff3b4e";
      ctx.beginPath();
      ctx.arc(proj.x - camera.x, proj.y - camera.y, proj.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}