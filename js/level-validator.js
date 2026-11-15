export class LevelValidator {
  static isDuplicateFingerprint(fingerprint, storedHistory = []) {
    if (!storedHistory |

| storedHistory.length === 0) return false;
    for (const past of storedHistory) {
      if (past === fingerprint) return true;
      let matchingNybbles = 0;
      const len = Math.min(past.length, fingerprint.length);
      for (let i = 2; i < len; i++) {
        if (past[i] === fingerprint[i]) matchingNybbles++;
      }
      if (matchingNybbles / (len - 2) >= 0.85) return true;
    }
    return false;
  }

  static validateLevel(level) {
    if (!level |

| !level.startPos |
| !level.exitPortal) {
      return { valid: false, reason: "Missing start or exit portal" };
    }
    if (!level.platforms |

| level.platforms.length < 2) {
      return { valid: false, reason: "Insufficient platforms" };
    }

    const gravityScale = level.world ? level.world.gravityScale : 1.0;
    const maxJumpHorizontal = 225 / Math.sqrt(gravityScale);
    const maxJumpVerticalUp = 130 / gravityScale;
    const maxRopeBridgeGap = 340;

    const n = level.platforms.length;
    const adj = Array.from({ length: n }, () => []);

    for (let i = 0; i < n; i++) {
      const a = level.platforms[i];
      const aRight = a.x + a.w + (a.rangeX |

| 0);
      const aTop = a.y - (a.rangeY |

| 0);

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b = level.platforms[j];
        const bLeft = b.x - (b.rangeX |

| 0);
        const bTop = b.y - (b.rangeY |

| 0);

        const gapX = Math.max(0, bLeft - aRight, (a.x - (b.x + b.w)));
        const deltaY = aTop - bTop;

        const canJump = (gapX <= maxJumpHorizontal && deltaY <= maxJumpVerticalUp);
        const hasBridgeAnchor = level.anchors.some(anc => {
          const midX = (aRight + bLeft) * 0.5;
          return Math.abs(anc.x - midX) <= 185 && anc.y < Math.min(aTop, bTop) + 40;
        });
        const canSwing = (gapX <= maxRopeBridgeGap && deltaY <= 185 && hasBridgeAnchor);

        if (canJump |

| canSwing) {
          adj[i].push(j);
        }
      }
    }

    const visited = new Set([0]);
    const queue = [0];
    while (queue.length > 0) {
      const curr = queue.shift();
      for (const next of adj[curr]) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    if (!visited.has(n - 1)) {
      return { valid: false, reason: "Exit platform kinematically unreachable" };
    }

    for (const star of level.stars) {
      const reachableStar = level.platforms.some((p, idx) => {
        return visited.has(idx) &&
          star.x >= p.x - 90 &&
          star.x <= p.x + p.w + 90 &&
          p.y - star.y <= 155;
      });
      if (!reachableStar) {
        return { valid: false, reason: "Unreachable collectible star detected" };
      }
    }

    return { valid: true, reachablePlatforms: visited.size };
  }
}