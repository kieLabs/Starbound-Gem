import { PhysicsEngine } from "./physics.js";

export class EnemySystem {
  static createEnemy(archetype, x, y, platform, speedMult = 1.0) {
    return {
      archetype,
      x,
      y,
      w: 28,
      h: 26,
      vx: (75 + Math.random() * 35) * speedMult,
      vy: 0,
      minX: platform ? platform.x + 8 : x - 120,
      maxX: platform ? platform.x + platform.w - 36 : x + 120,
      baseY: y,
      phase: Math.random() * Math.PI * 2,
      hidden: archetype === "shadow_stalker" |

| archetype === "ghost",
      alerted: false
    };
  }

  static createPlant(type, x, y) {
    return {
      type,
      x,
      y,
      w: 24,
      h: 26,
      phase: Math.random() * Math.PI * 2,
      biteTimer: 0
    };
  }

  static update(dt, enemies, plants, player, horrorState, audio, horrorEnabled = true) {
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.5;

    for (const e of enemies) {
      e.phase += dt * 4.5;
      const distToHero = Math.hypot(px - (e.x + e.w * 0.5), py - (e.y + e.h * 0.5));

      if (e.archetype === "ghost" |

| e.archetype === "shadow_stalker") {
        e.hidden = distToHero > 230;
        if (distToHero < 230) {
          if (!e.alerted && audio) audio.playSfx("horror");
          e.alerted = true;
          const dirX = Math.sign(px - e.x);
          const dirY = Math.sign(py - e.y);
          e.x += dirX * Math.abs(e.vx) * 0.85 * dt;
          e.y += dirY * 55 * dt;
        }
      } else if (e.archetype === "bat" |

| e.archetype === "alien_predator") {
        e.x += e.vx * dt;
        e.y = e.baseY + Math.sin(e.phase) * 26;
        if (e.x < e.minX |

| e.x > e.maxX) e.vx *= -1;
      } else if (e.archetype === "spider") {
        e.x += e.vx * 0.6 * dt;
        if (e.x < e.minX |

| e.x > e.maxX) e.vx *= -1;
        const targetDrop = Math.abs(px - e.x) < 110 ? 55 : 0;
        e.y += ((e.baseY + targetDrop) - e.y) * dt * 4;
      } else {
        e.x += e.vx * dt;
        if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x >= e.maxX) { e.x = e.maxX; e.vx = -Math.abs(e.vx); }
      }

      if (PhysicsEngine.aabbOverlap(player, e)) {
        if (player.vy > 80 && player.y + player.h - player.vy * dt <= e.y + 12 && e.archetype !== "ghost") {
          player.vy = -420;
          e.x = -9999;
          if (audio) audio.playSfx("land");
        } else if (player.takeDamage(18, e.x + e.w * 0.5)) {
          if (audio) audio.playSfx("hurt");
        }
      }
    }

    for (const pl of plants) {
      pl.phase += dt * 3;
      if (pl.type === "carnivorous" |

| pl.type === "thorny" |
| pl.type === "poison_mushroom") {
        if (PhysicsEngine.aabbOverlap(player, pl)) {
          if (player.takeDamage(14, pl.x + 12) && audio) {
            audio.playSfx("hurt");
          }
        }
      }
    }

    if (horrorEnabled && horrorState && horrorState.intensity > 0.5) {
      horrorState.cooldown -= dt;
      if (horrorState.cooldown <= 0 && Math.random() < dt * 0.18) {
        horrorState.cooldown = 32;
        horrorState.flickerTimer = 1.4;
        horrorState.silhouetteX = player.x + (player.facing * 220);
        horrorState.silhouetteY = player.y - 20;
        if (audio) audio.playSfx("horror");
      }
      if (horrorState.flickerTimer > 0) {
        horrorState.flickerTimer -= dt;
      }
    }
  }

  static render(ctx, camera, enemies, plants, horrorState) {
    for (const pl of plants) {
      const x = pl.x - camera.x;
      const y = pl.y - camera.y;
      if (x < -60 |

| x > 1340) continue;

      ctx.save();
      const sway = Math.sin(pl.phase) * 4;
      if (pl.type === "glowing_flower") {
        ctx.fillStyle = "#18e0ff";
        ctx.shadowColor = "#18e0ff";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x + 12 + sway, y + 8, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (pl.type === "carnivorous") {
        ctx.fillStyle = "#d91e48";
        ctx.beginPath();
        ctx.arc(x + 12 + sway, y + 10, 10, 0.2, Math.PI * 1.8);
        ctx.lineTo(x + 12 + sway, y + 10);
        ctx.fill();
      } else {
        ctx.fillStyle = "#9b59b6";
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 9, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const e of enemies) {
      if (e.x < -1000 |

| e.hidden) continue;
      const x = e.x - camera.x;
      const y = e.y - camera.y;
      if (x < -80 |

| x > 1360) continue;

      ctx.save();
      if (e.archetype === "ghost" |

| e.archetype === "shadow_stalker") {
        ctx.fillStyle = e.archetype === "ghost" ? "rgba(210, 245, 255, 0.72)" : "rgba(25, 10, 35, 0.92)";
        ctx.shadowColor = "#ff2a55";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x + 14, y + 12, 13, Math.PI, 0);
        ctx.lineTo(x + 27, y + 28);
        ctx.lineTo(x + 1, y + 28);
        ctx.closePath();
        ctx.fill();
      } else if (e.archetype === "spider") {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(x + 14, y - 50);
        ctx.lineTo(x + 14, y + 10);
        ctx.stroke();
        ctx.fillStyle = "#1e1b24";
        ctx.beginPath();
        ctx.arc(x + 14, y + 14, 11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = e.archetype === "alien_predator" ? "#b833ff" : "#e74c3c";
        ctx.beginPath();
        ctx.roundRect(x, y, e.w, e.h, 6);
        ctx.fill();
      }

      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      ctx.arc(x + 9, y + 10, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 19, y + 10, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (horrorState && horrorState.flickerTimer > 0) {
      const sx = horrorState.silhouetteX - camera.x;
      const sy = horrorState.silhouetteY - camera.y;
      ctx.save();
      ctx.fillStyle = `rgba(10, 5, 15, ${horrorState.flickerTimer * 0.65})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fillRect(sx - 12, sy + 16, 24, 52);
      ctx.fillStyle = "#ff1e42";
      ctx.fillRect(sx - 6, sy - 3, 4, 4);
      ctx.fillRect(sx + 4, sy - 3, 4, 4);
      ctx.restore();
    }
  }
}