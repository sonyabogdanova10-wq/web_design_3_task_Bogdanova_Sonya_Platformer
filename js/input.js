export default class Input {
  constructor() {
    this.keyboardKeys = new Set();
    this.pointerKeys = new Map();
    this.jumpQueued = false;
    this.active = true;
    
    this.controlCodes = new Set([
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Space", "KeyA", "KeyD", "KeyW"
    ]);
    this.jumpCodes = new Set(["Space", "ArrowUp", "KeyW"]);
    this.buttonActivationCodes = new Set(["Space", "Enter", "NumpadEnter"]);
    
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  onKeyDown = (event) => {
    if (!this.active) return;
    const tag = event.target && event.target.tagName ? event.target.tagName : "";
    const isButton = tag === "BUTTON";
    if (isButton && this.buttonActivationCodes.has(event.code)) return;
    if (!this.controlCodes.has(event.code)) return;
    event.preventDefault();
    this.keyboardKeys.add(event.code);
    if (!event.repeat && this.jumpCodes.has(event.code)) {
      this.jumpQueued = true;
    }
  };

  onKeyUp = (event) => {
    this.keyboardKeys.delete(event.code);
  };

  onBlur = () => {
    this.clear();
  };

  isDown(...codes) {
    return codes.some((code) => {
      return this.keyboardKeys.has(code) || this.pointerKeys.has(code);
    });
  }

  takeJump() {
    const value = this.jumpQueued;
    this.jumpQueued = false;
    return value;
  }

  clear() {
    this.keyboardKeys.clear();
    this.pointerKeys.clear();
    this.jumpQueued = false;
  }

  setActive(value) {
    this.active = value;
    if (!value) this.clear();
  }

  addPointerKey(code, pointerId) {
    if (!this.active) return;
    let set = this.pointerKeys.get(code);
    if (!set) {
      set = new Set();
      this.pointerKeys.set(code, set);
    }
    // Если pointerId не пришёл (редкий случай на мобильных), используем 0
    set.add(pointerId ?? 0);
  }

  removePointerKey(code, pointerId) {
    const set = this.pointerKeys.get(code);
    if (!set) return;
    set.delete(pointerId ?? 0);
    if (set.size === 0) this.pointerKeys.delete(code);
  }

  attachTouchControls(buttons = {}) {
    this.bindPointerButton(buttons.left, "ArrowLeft");
    this.bindPointerButton(buttons.right, "ArrowRight");
    this.bindJumpButton(buttons.jump);
  }

  bindPointerButton(element, code) {
    if (!element) return;
    if (element.dataset.inputBound === "true") return;
    element.dataset.inputBound = "true";

    // --- Pointer events (для мыши и современных мобильных) ---
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (!this.active) return;
      this.addPointerKey(code, event.pointerId);
    });

    const releasePointer = (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      this.removePointerKey(code, event.pointerId);
    };
    element.addEventListener("pointerup", releasePointer);
    element.addEventListener("pointercancel", releasePointer);
    element.addEventListener("lostpointercapture", releasePointer);

    // --- Touch events (подстраховка для мобильных браузеров) ---
    element.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (!this.active) return;
      // Используем идентификатор первого касания
      const touch = event.changedTouches[0];
      this.addPointerKey(code, touch ? touch.identifier : 0);
    }, { passive: false });

    const releaseTouch = (event) => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      this.removePointerKey(code, touch ? touch.identifier : 0);
    };
    element.addEventListener("touchend", releaseTouch, { passive: false });
    element.addEventListener("touchcancel", releaseTouch, { passive: false });

    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }

  bindJumpButton(element) {
    if (!element) return;
    if (element.dataset.inputBound === "true") return;
    element.dataset.inputBound = "true";

    // --- Pointer events ---
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (!this.active) return;
      this.jumpQueued = true;
    });

    const endPointer = (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
    };
    element.addEventListener("pointerup", endPointer);
    element.addEventListener("pointercancel", endPointer);
    element.addEventListener("lostpointercapture", endPointer);

    // --- Touch events (подстраховка) ---
    element.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (!this.active) return;
      this.jumpQueued = true;
    }, { passive: false });

    element.addEventListener("touchend", (event) => {
      event.preventDefault();
    }, { passive: false });

    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }
}
