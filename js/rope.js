import { Vec2, PhysicsEngine } from "./physics.js";

export class RopeNode {
  constructor(x, y, pinned = false) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.pinned = pinned;
  }
}

export class VerletRope {
  constructor() {
    this.active = false;
    this.anchor = null;
    this.pivots = [];
    this.nodes = [];
    this.segmentLength = 14;
    this.solverIterations = 40;
    this.damping = 0.992;
    this.maxCastRange = 250;
    this.minRopeLength = 36;
    this.maxRopeLength = 260;
    this.totalLength = 140;
  }

  tryAttach(player, anchors, platforms) {
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.35;
    let bestAnchor = null;
    let bestScore = Infinity;

    for (const a of anchors) {
      const dist = Math.hypot(a.x - px, a.y - py);
      if (dist <= this.maxCastRange && dist >= 28 && a.y < py + 45) {
        const dirBias = (a.x - px) * player.facing > 0 ? 0.78 : 1.05;
        const score = dist * dirBias;
        if (score < bestScore) {
          bestScore = score;
          bestAnchor = a;
        }
      }
    }

    if (!bestAnchor) return false;

    this.active = true;
    this.anchor = bestAnchor;
    this.pivots = [{ x: bestAnchor.x, y: bestAnchor.y }];
    const dist = Math.max(48, Math.hypot(px - bestAnchor.x, py - bestAnchor.y));
    this.totalLength = Math.min(this.maxRopeLength, dist);
    const count = Math.max(5, Math.round(this.totalLength / this.segmentLength));
    this.nodes = [];

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const nx = bestAnchor.x + (px - bestAnchor.x) * t;
      const ny = bestAnchor.y + (py - bestAnchor.y) * t;
      const node = new RopeNode(nx, ny, i === 0);
      if (i === count) {
        node.prevX = nx - player.vx * 0.016;
        node.prevY = ny - player.vy * 0.016;
      }
      this.nodes.push(node);
    }
    return true;
  }

  adjustLength(delta) {
    if (!this.active |

| this.nodes.length < 3) return;
    this.totalLength = Math.max(this.minRopeLength, Math.min(this.maxRopeLength, this.totalLength + delta));
    this.segmentLength = this.totalLength / (this.nodes.length - 1);
  }

  release(player) {
    if (!this.active) return false;
    this.active = false;
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 90) {
      player.vx *= 1.16;
      player.vy = Math.min(player.vy * 1.08 - 85, -190);
    }
    this.nodes = [];
    this.pivots = [];
    this.anchor = null;
    return true;
  }

  update(dt, player, physics, platforms) {
    if (!this.active |

| this.nodes.length < 2) return;

    const g = physics.getEffectiveGravity();
    const windX = physics.windForce.x;
    const windY = physics.windForce.y;

    const activePivot = this.pivots[this.pivots.length - 1];
    this.nodes[0].x = activePivot.x;
    this.nodes[0].y = activePivot.y;
    this.nodes[0].pinned = true;

    const lastIdx = this.nodes.length - 1;
    const tail = this.nodes[lastIdx];

    for (let i = 1; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const vx = (n.x - n.prevX) * this.damping;
      const vy = (n.y - n.prevY) * this.damping;
      n.prevX = n.x;
      n.prevY = n.y;

      let ax = windX * 0.65;
      let ay = g + windY;
      if (i === lastIdx) {
        ax += player.swingInputX * 680;
      }
      n.x += vx + ax * dt * dt;
      n.y += vy + ay * dt * dt;
    }

    if (platforms && platforms.length > 0) {
      for (const p of platforms) {
        if (p.collapsed) continue;
        const hit = PhysicsEngine.segmentIntersectsRect(
          activePivot.x, activePivot.y,
          tail.x, tail.y,
          p.x + 2, p.y + 2, p.w - 4, p.h - 4
        );
        if (hit && Math.hypot(hit.x - activePivot.x, hit.y - activePivot.y) > 18 && this.pivots.length < 4) {
          const cornerX = hit.x < p.x + p.w * 0.5 ? p.x : p.x + p.w;
          const cornerY = hit.y < p.y + p.h * 0.5 ? p.y : p.y + p.h;
          this.pivots.push({ x: cornerX, y: cornerY });
          this.nodes[0].x = cornerX;
          this.nodes[0].y = cornerY;
          break;
        }
      }
    }

    for (let iter = 0; iter < this.solverIterations; iter++) {
      for (let i = 0; i < this.nodes.length - 1; i++) {
        const n1 = this.nodes[i];
        const n2 = this.nodes[i + 1];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) |

| 0.0001;
        const diff = (dist - this.segmentLength) / dist;

        if (n1.pinned) {
          n2.x -= dx * diff;
          n2.y -= dy * diff;
        } else if (i + 1 === lastIdx) {
          n1.x += dx * diff * 0.72;
          n1.y += dy * diff * 0.72;
          n2.x -= dx * diff * 0.28;
          n2.y -= dy * diff * 0.28;
        } else {
          n1.x += dx * diff * 0.5;
          n1.y += dy * diff * 0.5;
          n2.x -= dx * diff * 0.5;
          n2.y -= dy * diff * 0.5;
        }
      }
    }

    const newVx = (tail.x - tail.prevX) / dt;
    const newVy = (tail.y - tail.prevY) / dt;
    player.x = tail.x - player.w * 0.5;
    player.y = tail.y - player.h * 0.35;
    player.vx = newVx;
    player.vy = newVy;
  }

  render(ctx, camera) {
    if (!this.active |

| this.nodes.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = "rgba(255, 165, 60, 0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < this.pivots.length; i++) {
      const pv = this.pivots[i];
      if (i === 0) ctx.moveTo(pv.x - camera.x, pv.y - camera.y);
      else ctx.lineTo(pv.x - camera.x, pv.y - camera.y);
    }
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      ctx.lineTo(n.x - camera.x, n.y - camera.y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#f5b041";
    ctx.lineWidth = 2.6;
    ctx.stroke();

    const root = this.pivots[0];
    ctx.fillStyle = "#18e0ff";
    ctx.beginPath();
    ctx.arc(root.x - camera.x, root.y - camera.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}