import { StarboundGame } from "./game.js";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game-canvas");
  const game = new StarboundGame(canvas);
  window.STARBOUND_GAME = game;

  const FIXED_DT = 1 / 60;
  let accumulator = 0;
  let lastTime = performance.now();

  function frame(now) {
    let frameTime = (now - lastTime) / 1000;
    lastTime = now;
    if (frameTime > 0.1) frameTime = 0.1;

    accumulator += frameTime;
    while (accumulator >= FIXED_DT) {
      game.stepPhysics(FIXED_DT);
      accumulator -= FIXED_DT;
    }

    game.render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  const params = new URLSearchParams(window.location.search);
  if (params.get("test") === "true") {
    game.executeAndDisplayTestSuite();
  }
});