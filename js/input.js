export default class Input {
  constructor() {
    // Клавиши, нажатые с клавиатуры.
    this.keyboardKeys = new Set();

    // Клавиши, нажатые сенсорными кнопками.
    // Формат: code -> Set(pointerId)
    this.pointerKeys = new Map();

    // Прыжок по нажатию, а не по удержанию.
    this.jumpQueued = false;

    // Активен ли ввод сейчас.
    this.active = true;

    this.controlCodes = new Set([
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
      "KeyA",
      "KeyD",
      "KeyW"
    ]);

    this.jumpCodes = new Set([
      "Space",
      "ArrowUp",
      "KeyW"
    ]);

    // Эти клавиши на кнопке лучше оставить кнопке, а не игре.
    this.buttonActivationCodes = new Set([
      "Space",
      "Enter",
      "NumpadEnter"
    ]);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  onKeyDown = (event) => {
    if (!this.active) return;

    const tag = event.target && event.target.tagName ? event.target.tagName : "";
    const isButton = tag === "BUTTON";

    // Если фокус на кнопке и нажат Space/Enter, пусть кнопка сработает сама.
    if (isButton && this.buttonActivationCodes.has(event.code)) {
      return;
    }

    if (!this.controlCodes.has(event.code)) return;

    // Чтобы страница не прокручивалась игровыми клавишами.
    event.preventDefault();

    this.keyboardKeys.add(event.code);

    // Прыжок по нажатию, а не по удержанию.
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

    if (!value) {
      this.clear();
    }
  }

  addPointerKey(code, pointerId) {
    if (!this.active) return;

    let set = this.pointerKeys.get(code);

    if (!set) {
      set = new Set();
      this.pointerKeys.set(code, set);
    }

    set.add(pointerId);
  }

  removePointerKey(code, pointerId) {
    const set = this.pointerKeys.get(code);

    if (!set) return;

    set.delete(pointerId);

    if (set.size === 0) {
      this.pointerKeys.delete(code);
    }
  }

  attachTouchControls(buttons = {}) {
    this.bindPointerButton(buttons.left, "ArrowLeft");
    this.bindPointerButton(buttons.right, "ArrowRight");
    this.bindJumpButton(buttons.jump);
  }

  bindPointerButton(element, code) {
    if (!element) return;

    // Защита от повторной привязки.
    if (element.dataset.inputBound === "true") return;
    element.dataset.inputBound = "true";

    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      if (!this.active) return;

      if (
        typeof element.setPointerCapture === "function" &&
        event.pointerId !== undefined
      ) {
        try {
          element.setPointerCapture(event.pointerId);
        } catch (error) {
        }
      }

      this.addPointerKey(code, event.pointerId);
    });

    const release = (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      this.removePointerKey(code, event.pointerId);
    };

    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("lostpointercapture", release);

    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }

  bindJumpButton(element) {
    if (!element) return;

    // Защита от повторной привязки.
    if (element.dataset.inputBound === "true") return;
    element.dataset.inputBound = "true";

    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      if (!this.active) return;

      this.jumpQueued = true;
    });

    const end = (event) => {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
    };

    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    element.addEventListener("lostpointercapture", end);

    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }
}