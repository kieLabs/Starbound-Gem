export class InputController {
  constructor(canvas, saveSystem) {
    this.canvas = canvas;
    this.saveSystem = saveSystem;
    this.state = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      jumpPressed: false,
      rope: false,
      ropePressed: false,
      releasePressed: false,
      pausePressed: false
    };
    this._prevJump = false;
    this._prevRope = false;
    this.isTouchDevice = ("ontouchstart" in window) |

| (navigator.maxTouchPoints > 0);
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "KeyA" |

| e.code === "ArrowLeft") this.state.left = true;
      if (e.code === "KeyD" |

| e.code === "ArrowRight") this.state.right = true;
      if (e.code === "KeyW" |

| e.code === "ArrowUp") this.state.up = true;
      if (e.code === "KeyS" |

| e.code === "ArrowDown") this.state.down = true;
      if (e.code === "Space" |

| e.code === "KeyZ" |
| e.code === "KeyW" |
| e.code === "ArrowUp") {
        this.state.jump = true;
      }
      if (e.code === "KeyE" |

| e.code === "ShiftLeft" |
| e.code === "ShiftRight" |
| e.code === "KeyK") {
        this.state.rope = true;
      }
      if (e.code === "KeyQ" |

| e.code === "KeyX") {
        this.state.releasePressed = true;
      }
      if (e.code === "Escape" |

| e.code === "KeyP") {
        this.state.pausePressed = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyA" |

| e.code === "ArrowLeft") this.state.left = false;
      if (e.code === "KeyD" |

| e.code === "ArrowRight") this.state.right = false;
      if (e.code === "KeyW" |

| e.code === "ArrowUp") this.state.up = false;
      if (e.code === "KeyS" |

| e.code === "ArrowDown") this.state.down = false;
      if (e.code === "Space" |

| e.code === "KeyZ" |
| e.code === "KeyW" |
| e.code === "ArrowUp") {
        this.state.jump = false;
      }
      if (e.code === "KeyE" |

| e.code === "ShiftLeft" |
| e.code === "ShiftRight" |
| e.code === "KeyK") {
        this.state.rope = false;
      }
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.state.rope = true;
      if (e.button === 2) this.state.releasePressed = true;
    });
    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.state.rope = false;
    });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    const bindTouchBtn = (id, field, isOneShot = false) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const activate = (e) => {
        e.preventDefault();
        btn.classList.add("active");
        this.state[field] = true;
      };
      const deactivate = (e) => {
        e.preventDefault();
        btn.classList.remove("active");
        if (!isOneShot) this.state[field] = false;
      };
      btn.addEventListener("pointerdown", activate);
      btn.addEventListener("pointerup", deactivate);
      btn.addEventListener("pointercancel", deactivate);
      btn.addEventListener("pointerleave", deactivate);
    };

    bindTouchBtn("touch-btn-left", "left");
    bindTouchBtn("touch-btn-right", "right");
    bindTouchBtn("touch-btn-up", "up");
    bindTouchBtn("touch-btn-down", "down");
    bindTouchBtn("touch-btn-jump", "jump");
    bindTouchBtn("touch-btn-rope", "rope");
    bindTouchBtn("touch-btn-release", "releasePressed", true);
  }

  updateEdges() {
    this.state.jumpPressed = this.state.jump && !this._prevJump;
    this.state.ropePressed = this.state.rope && !this._prevRope;
    this._prevJump = this.state.jump;
    this._prevRope = this.state.rope;
  }

  clearOneShots() {
    this.state.jumpPressed = false;
    this.state.ropePressed = false;
    this.state.releasePressed = false;
    this.state.pausePressed = false;
  }
}