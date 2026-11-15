export const OBJECTIVE_TYPES = [
  "collect_stars",
  "find_key",
  "activate_switches",
  "escape_monster",
  "reach_portal",
  "rescue_creature",
  "survive_storm",
  "escape_collapse",
  "activate_power",
  "find_passage",
  "solve_physics",
  "cross_hazard",
  "beat_timer",
  "defeat_boss",
  "find_artifact"
];

export class ObjectiveSystem {
  constructor() {
    this.activeObjectives = [];
    this.timerRemaining = 0;
    this.stormTimer = 0;
  }

  configureForLevel(levelData, difficulty, rng) {
    this.activeObjectives = [];
    if (difficulty.isBossLevel) {
      this.activeObjectives.push({
        type: "defeat_boss",
        label: `Defeat ${levelData.boss ? levelData.boss.name : "the Guardian"} & Enter Portal`,
        completed: false
      });
      return;
    }

    const pool = [
      "collect_stars",
      "find_key",
      "activate_switches",
      "rescue_creature",
      "activate_power",
      "find_artifact",
      "solve_physics",
      "beat_timer",
      "survive_storm",
      "escape_monster"
    ];

    const chosen = pool[Math.floor(rng() * pool.length)];
    if (chosen === "collect_stars") {
      this.activeObjectives.push({ type: "collect_stars", label: `Collect All ${levelData.stars.length} Glowing Stars`, completed: false });
    } else if (chosen === "find_key") {
      this.activeObjectives.push({ type: "find_key", label: "Find the Hidden Astral Key & Reach Portal", completed: false });
    } else if (chosen === "activate_switches") {
      this.activeObjectives.push({ type: "activate_switches", label: `Activate Ancient Switches (0/${levelData.switches.length})`, completed: false });
    } else if (chosen === "rescue_creature") {
      this.activeObjectives.push({ type: "rescue_creature", label: "Rescue the Trapped Lumina Creature", completed: false });
    } else if (chosen === "activate_power") {
      this.activeObjectives.push({ type: "activate_power", label: `Ignite Power Beacons (0/${levelData.beacons.length})`, completed: false });
    } else if (chosen === "find_artifact") {
      this.activeObjectives.push({ type: "find_artifact", label: "Recover the Ancient Star Artifact", completed: false });
    } else if (chosen === "solve_physics") {
      this.activeObjectives.push({ type: "solve_physics", label: "Push Counterweight Crate onto Pressure Gate", completed: false });
    } else if (chosen === "beat_timer") {
      this.timerRemaining = 65;
      this.activeObjectives.push({ type: "beat_timer", label: "Escape Collapsing Sector Before Time Runs Out (65s)", completed: false });
    } else if (chosen === "survive_storm") {
      this.stormTimer = 18;
      this.activeObjectives.push({ type: "survive_storm", label: "Survive the Apex Storm Surge (18s) & Reach Portal", completed: false });
    } else {
      this.activeObjectives.push({ type: "escape_monster", label: "Evade the Relentless Stalker & Reach Portal", completed: false });
    }
  }

  update(dt, levelData, player) {
    for (const obj of this.activeObjectives) {
      if (obj.type === "collect_stars") {
        const collected = levelData.stars.filter(s => s.collected).length;
        obj.label = `Collect Glowing Stars (${collected}/${levelData.stars.length}) & Reach Portal`;
        obj.completed = (collected >= levelData.stars.length);
      } else if (obj.type === "find_key") {
        obj.completed = player.hasKey;
        obj.label = player.hasKey ? "Astral Key Acquired! Enter the Portal" : "Find the Hidden Astral Key";
      } else if (obj.type === "activate_switches" |

| obj.type === "solve_physics") {
        const activeCount = levelData.switches.filter(s => s.active).length;
        obj.label = `Activate Ancient Switches (${activeCount}/${levelData.switches.length}) & Reach Portal`;
        obj.completed = (activeCount >= levelData.switches.length);
      } else if (obj.type === "rescue_creature") {
        obj.completed = player.rescuedCreature;
        obj.label = player.rescuedCreature ? "Creature Rescued! Guide to Portal" : "Shatter the Cage to Rescue the Creature";
      } else if (obj.type === "activate_power") {
        const lit = levelData.beacons.filter(b => b.active).length;
        obj.label = `Ignite Power Beacons (${lit}/${levelData.beacons.length}) & Reach Portal`;
        obj.completed = (lit >= levelData.beacons.length);
      } else if (obj.type === "find_artifact") {
        obj.completed = player.hasArtifact;
        obj.label = player.hasArtifact ? "Ancient Artifact Secured! Enter Portal" : "Recover the Ancient Star Artifact";
      } else if (obj.type === "beat_timer") {
        this.timerRemaining = Math.max(0, this.timerRemaining - dt);
        obj.label = `Escape Before Collapse (${this.timerRemaining.toFixed(1)}s)`;
        obj.completed = this.timerRemaining > 0;
        if (this.timerRemaining <= 0) player.takeDamage(999);
      } else if (obj.type === "survive_storm") {
        this.stormTimer = Math.max(0, this.stormTimer - dt);
        obj.completed = (this.stormTimer <= 0);
        obj.label = obj.completed ? "Storm Survived! Enter the Portal" : `Survive the Storm (${this.stormTimer.toFixed(1)}s)`;
      } else if (obj.type === "defeat_boss") {
        obj.completed = Boolean(levelData.boss && levelData.boss.defeated);
        obj.label = obj.completed ? "Guardian Defeated! Enter the Portal" : `Defeat ${levelData.boss ? levelData.boss.name : "Boss"}`;
      } else {
        obj.completed = true;
      }
    }
  }

  allCompleted() {
    return this.activeObjectives.every(o => o.completed);
  }

  getSummaryText() {
    return this.activeObjectives.map(o => o.label).join(" | ");
  }
}