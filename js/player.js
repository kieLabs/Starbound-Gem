import { PhysicsEngine } from "./physics.js";

export class StickmanPlayer {
  constructor(x = 100, y = 300) {
    this.w = 24;
    this.h = 46;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.swingInputX = 0;
    this.animCycle = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.invulnerableTimer = 0;
    this.lanternEnergy = 1.0;
    this.hasKey = false;
    this.hasArtifact = false;
    this.rescuedCreature = false;
    this.dead = false;
    this.surfaceFriction = 1.0;
  }

  takeDamage(amount, sourceX = null) {
    if (this.invulnerableTimer > 0 |

| this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableTimer = 0.85;
    this.vy = -280;
    if (sourceX !== null) {
      this.vx = this.x < sourceX ? -240 : 240;
    }
    if (this.health <= 0) {
      this.dead = true;
    }
    return true;
  }

  update(dt, input, physics, rope, platforms, props, gates, switches, audio) {
    if (this.dead) return;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) this.facing = moveDir;
    this.swingInputX = moveDir;

    if (input.jumpPressed) {
      this.jumpBufferTimer = 0.12;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
    }

    if (rope.active) {
      if (input.up) rope.adjustLength(-150 * dt);
      if (input.down) rope.adjustLength(150 * dt);
      if (input.releasePressed |

| input.jumpPressed) {
        rope.release(this);
        this.jumpBufferTimer = 0;
        if (audio) audio.playSfx("jump");
      } else {
        rope.update(dt, this, physics, platforms);
        this.animCycle += dt * 5;
        return;
      }
    } else if (input.ropePressed) {
      if (rope.tryAttach(this, this.levelAnchors |

| [], platforms)) {
        if (audio) audio.playSfx("rope");
        return;
      }
    }

    const effectiveFriction = this.surfaceFriction * physics.globalFrictionMultiplier;
    const accel = this.onGround ? 1850 * effectiveFriction : 1150;
    const maxSpeed = 275;

    if (moveDir !== 0) {
      this.vx += moveDir * accel * dt;
      if (Math.abs(this.vx) > maxSpeed) {
        this.vx = Math.sign(this.vx) * maxSpeed;
      }
    } else {
      const damping = this.onGround ? Math.pow(0.001, dt * effectiveFriction) : Math.pow(0.18, dt);
      this.vx *= damping;
      if (Math.abs(this.vx) < 4) this.vx = 0;
    }

    this.vx += physics.windForce.x * (this.onGround ? 0.35 : 0.85) * dt;
    this.vy += (physics.getEffectiveGravity() + physics.windForce.y) * dt;
    if (this.vy > 860) this.vy = 860;

    if (this.onGround) {
      this.coyoteTimer = 0.10;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      const jumpSpeed = -608 * (this.inMud ? 0.76 : 1.0);
      this.vy = jumpSpeed;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      if (audio) audio.playSfx("jump");
    }

    if (!input.jump && this.vy < -220) {
      this.vy *= 0.88;
    }

    const allSolids = [
      ...platforms.filter(p => !p.collapsed),
      ...gates.filter(g => !g.open)
    ];

    this.x += this.vx * dt;
    for (const box of props) {
      if (PhysicsEngine.aabbOverlap(this, box)) {
        if (this.vx > 0 && this.x + this.w - this.vx * dt <= box.x + 8) {
          box.vx = Math.max(box.vx, 125);
          this.x = box.x - this.w;
        } else if (this.vx < 0 && this.x - this.vx * dt >= box.x + box.w - 8) {
          box.vx = Math.min(box.vx, -125);
          this.x = box.x + box.w;
        }
      }
    }

    for (const s of allSolids) {
      if (PhysicsEngine.aabbOverlap(this, s)) {
        if (this.vx > 0) this.x = s.x - this.w;
        else if (this.vx < 0) this.x = s.x + s.w;
        this.vx = 0;
      }
    }

    const wasOnGround = this.onGround;
    this.onGround = false;
    this.inMud = false;
    this.surfaceFriction = 1.0;
    this.y += this.vy * dt;

    const verticalColliders = [...allSolids, ...props];
    for (const s of verticalColliders) {
      if (PhysicsEngine.aabbOverlap(this, s)) {
        if (this.vy > 0) {
          this.y = s.y - this.h;
          if (this.vy > 480 && !wasOnGround && audio) {
            audio.playSfx("land");
          }
          this.vy = 0;
          this.onGround = true;
          this.surfaceFriction = s.friction |

| 1.0;
          this.inMud = Boolean(s.isMud);
          if (s.type === "moving") {
            this.x += (s.x - (s.prevX |

| s.x));
            this.y += (s.y - (s.prevY |

| s.y));
          } else if (s.type === "collapsing") {
            s.triggered = true;
          }
        } else if (this.vy < 0) {
          this.y = s.y + s.h;
          this.vy = 0;
        }
      }
    }

    for (const sw of switches) {
      if (PhysicsEngine.aabbOverlap(this, sw)) {
        if (!sw.active) sw.justActivated = true;
        sw.active = true;
      }
    }

    if (Math.abs(this.vx) > 15 && this.onGround) {
      this.animCycle += dt * (Math.abs(this.vx) * 0.045);
    } else {
      this.animCycle += dt * 2.2;
    }
  }

  render(ctx, camera) {
    const cx = this.x + this.w * 0.5 - camera.x;
    const cy = this.y - camera.y;

    ctx.save();
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 16) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.shadowColor = "#ff7b1c";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#ff7b1c";
    ctx.fillStyle = "#ff9436";
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const runSwing = this.onGround && Math.abs(this.vx) > 15
      ? Math.sin(this.animCycle * 2.2) * 9
      : (this.vy < 0 ? -6 : 4);

    const headY = cy + 10;
    ctx.beginPath();
    ctx.arc(cx, headY, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx + this.facing * 3.2, headY - 1, 2.1, 0, Math.PI * 2);
    ctx.fill();

    const neckY = cy + 17;
    const hipY = cy + 31;
    ctx.beginPath();
    ctx.moveTo(cx, neckY);
    ctx.lineTo(cx - this.facing * 1.5, hipY);
    ctx.stroke();

    const armY = cy + 20;
    ctx.beginPath();
    ctx.moveTo(cx - runSwing * 0.7, armY + 8);
    ctx.lineTo(cx, armY);
    ctx.lineTo(cx + runSwing * 0.9 + this.facing * 4, armY + 7);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - runSwing, cy + this.h);
    ctx.lineTo(cx - this.facing * 1.5, hipY);
    ctx.lineTo(cx + runSwing, cy + this.h);
    ctx.stroke();

    ctx.restore();
  }
}