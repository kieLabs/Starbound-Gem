export class DifficultySystem {
  static getProfile(levelNumber) {
    const lvl = Math.max(1, levelNumber);
    let stageName = "STAGE 1: HARD INTRODUCTION";
    let platformWidthRange = [180, 250];
    let gapRange = [75, 135];
    let enemyCount = 2;
    let enemySpeedMult = 1.0;
    let hazardCount = 2;
    let objectiveCount = 1;
    let weatherSeverity = 0.25;
    let levelLength = 2400;

    if (lvl >= 11 && lvl <= 25) {
      stageName = "STAGE 2: ROPE PUZZLES & MOVING TERRAIN";
      platformWidthRange = [150, 210];
      gapRange = [95, 165];
      enemyCount = 4;
      enemySpeedMult = 1.15;
      hazardCount = 4;
      objectiveCount = 1;
      weatherSeverity = 0.45;
      levelLength = 2850;
    } else if (lvl >= 26 && lvl <= 50) {
      stageName = "STAGE 3: ADVANCED PHYSICS & MULTI-OBJECTIVES";
      platformWidthRange = [130, 185];
      gapRange = [110, 180];
      enemyCount = 6;
      enemySpeedMult = 1.3;
      hazardCount = 6;
      objectiveCount = 2;
      weatherSeverity = 0.6;
      levelLength = 3300;
    } else if (lvl >= 51 && lvl <= 100) {
      stageName = "STAGE 4: HARSH WEATHER & LETHAL COMBINATIONS";
      platformWidthRange = [110, 160];
      gapRange = [125, 195];
      enemyCount = 8;
      enemySpeedMult = 1.45;
      hazardCount = 8;
      objectiveCount = 2;
      weatherSeverity = 0.78;
      levelLength = 3700;
    } else if (lvl >= 101 && lvl <= 250) {
      stageName = "STAGE 5: EXPERT PRECISION FRONTIER";
      platformWidthRange = [95, 140];
      gapRange = [135, 205];
      enemyCount = 10;
      enemySpeedMult = 1.65;
      hazardCount = 10;
      objectiveCount = 2;
      weatherSeverity = 0.88;
      levelLength = 4100;
    } else if (lvl >= 251 && lvl <= 500) {
      stageName = "STAGE 6: EXTREME SURVIVAL GAUNTLET";
      platformWidthRange = [82, 122];
      gapRange = [145, 215];
      enemyCount = 12;
      enemySpeedMult = 1.85;
      hazardCount = 13;
      objectiveCount = 3;
      weatherSeverity = 0.95;
      levelLength = 4500;
    } else if (lvl >= 501) {
      stageName = "STAGE 7: ENDLESS NIGHTMARE ASCENSION";
      platformWidthRange = [72, 108];
      gapRange = [150, 220];
      enemyCount = 14 + Math.min(8, Math.floor((lvl - 500) / 50));
      enemySpeedMult = 2.05;
      hazardCount = 16;
      objectiveCount = 3;
      weatherSeverity = 1.0;
      levelLength = 4900;
    }

    const isBossLevel = (lvl % 10 === 0);
    const isSecretSpecial = (!isBossLevel && lvl > 5 && lvl % 13 === 0);

    return {
      level: lvl,
      stageName,
      platformWidthRange,
      gapRange,
      enemyCount,
      enemySpeedMult,
      hazardCount,
      objectiveCount,
      weatherSeverity,
      levelLength: isBossLevel ? 1950 : levelLength,
      isBossLevel,
      isSecretSpecial
    };
  }
}