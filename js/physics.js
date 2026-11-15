export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) { this.x = x; this.y = y; return this; }
  clone() { return new Vec2(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  scale(s) { this.x *= s; this.y *= s; return this; }
  len() { return Math.hypot(this.x, this.y); }
  normalize() {
    const l = this.len();
    if (l > 1e-6) { this.x /= l; this.y /= l; }
    return this;
  }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
}

export class PhysicsEngine {
  constructor() {
    this.baseGravity = 1610;
    this.gravityScale = 1.0;
    this.windForce = new Vec2(0, 0);
    this.globalFrictionMultiplier = 1.0;
  }

  getEffectiveGravity() {
    return this.baseGravity * this.gravityScale;
  }

  static aabbOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  static circleRectOverlap(cx, cy, r, rect) {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (r * r);
  }

  static segmentIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    const left = PhysicsEngine.lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);
    const right = PhysicsEngine.lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
    const top = PhysicsEngine.lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);
    const bottom = PhysicsEngine.lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);
    const hits = [left, right, top, bottom].filter(Boolean);
    if (hits.length === 0) return null;
    hits.sort((a, b) => Math.hypot(a.x - x1, a.y - y1) - Math.hypot(b.x - x1, b.y - y1));
    return hits[0];
  }

  static lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < 1e-6) return null;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1)
      };
    }
    return null;
  }

  updateMovingPlatforms(platforms, dt, time) {
    for (const p of platforms) {
      p.prevX = p.x;
      p.prevY = p.y;
      if (p.type === "moving") {
        const phase = time * p.speed + (p.phaseOffset |

| 0);
        p.x = p.originX + Math.sin(phase) * p.rangeX;
        p.y = p.originY + Math.cos(phase) * p.rangeY;
        p.vx = (p.x - p.prevX) / dt;
        p.vy = (p.y - p.prevY) / dt;
      } else if (p.type === "collapsing") {
        if (p.triggered && !p.collapsed) {
          p.collapseTimer -= dt;
          if (p.collapseTimer <= 0) {
            p.collapsed = true;
            p.respawnTimer = 4.5;
          }
        } else if (p.collapsed) {
          p.respawnTimer -= dt;
          if (p.respawnTimer <= 0) {
            p.collapsed = false;
            p.triggered = false;
            p.collapseTimer = 0.65;
          }
        }
      }
    }
  }

  updatePhysicsProps(props, platforms, switches, gates, dt) {
    const g = this.getEffectiveGravity();
    for (const box of props) {
      box.vy += g * dt;
      box.vx += this.windForce.x * 0.25 * dt;
      box.vx *= 0.88;

      box.x += box.vx * dt;
      for (const p of platforms) {
        if (p.collapsed) continue;
        if (PhysicsEngine.aabbOverlap(box, p)) {
          if (box.vx > 0) box.x = p.x - box.w;
          else if (box.vx < 0) box.x = p.x + p.w;
          box.vx = 0;
        }
      }

      box.y += box.vy * dt;
      box.onGround = false;
      for (const p of platforms) {
        if (p.collapsed) continue;
        if (PhysicsEngine.aabbOverlap(box, p)) {
          if (box.vy > 0) {
            box.y = p.y - box.h;
            box.vy = 0;
            box.onGround = true;
            if (p.type === "moving") {
              box.x += (p.x - p.prevX);
            }
          } else if (box.vy < 0) {
            box.y = p.y + p.h;
            box.vy = 0;
          }
        }
      }
    }

    for (const sw of switches) {
      const wasActive = sw.active;
      sw.active = sw.latched ? sw.active : false;
      for (const box of props) {
        if (PhysicsEngine.aabbOverlap(box, sw)) {
          sw.active = true;
        }
      }
      sw.justActivated = !wasActive && sw.active;
    }

    for (const gate of gates) {
      const linkedSwitch = switches.find(s => s.id === gate.switchId);
      const shouldOpen = linkedSwitch ? linkedSwitch.active : gate.open;
      gate.open = shouldOpen;
      const targetY = gate.open ? gate.originY - gate.h - 16 : gate.originY;
      gate.y += (targetY - gate.y) * Math.min(1, dt * 6);
    }
  }
}