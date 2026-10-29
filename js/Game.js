import Player from "./Player.js";
import Input from "./input.js";
import { rectsIntersect } from "./collision.js";

const STORAGE_KEY = "catPlatformerBestScore";

export default class Game {
  constructor(canvas, ui = {}) {
    this.canvas = canvas;

    // Логический размер уровня остаётся 800×450, а буфер рисования
    // увеличивается с учётом плотности пикселей экрана (HiDPI / 4K).
    this.width = Number(canvas.getAttribute("width")) || 800;
    this.height = Number(canvas.getAttribute("height")) || 450;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.resizeCanvas();

    this.ui = {
      startBtn: ui.startBtn || null,
      pauseBtn: ui.pauseBtn || null,
      resumeBtn: ui.resumeBtn || null,
      restartBtn: ui.restartBtn || null,

      stateEl: ui.stateEl || null,
      fishEl: ui.fishEl || null,
      bestEl: ui.bestEl || null,

      leftBtn: ui.leftBtn || null,
      rightBtn: ui.rightBtn || null,
      jumpBtn: ui.jumpBtn || null
    };

    this.input = new Input();

    // Состояния игры:
    // stopped — остановлено
    // running — идёт игра
    // paused  — пауза
    // won     — победа
    // lost    — поражение
    this.state = "stopped";
    this.dialogue = null;

    // ID текущего requestAnimationFrame
    this.rafId = null;

    // Время последнего кадра
    this.lastTime = 0;

    // Если true, после возврата во вкладку игра продолжится сама
    this.autoResumeOnVisible = false;

    // Камера для длинного уровня
    this.camera = {
      x: 0,
      y: 0
    };

    // Счёт и рекорд
    this.score = 0;
    this.bestScore = 0;
    this.totalItems = 0;

    // Время для анимации лавы, лун и визуальных эффектов
    this.lavaTime = 0;

    // Текст результата для победы/поражения
    this.result = {
      title: "",
      text: ""
    };

    const levelWidth = 2650;
    const lavaY = this.height - 40;

    this.level = {
      width: levelWidth,
      height: this.height,

      // Платформы теперь — островки и уступы над лавой
      platforms: [
        // Стартовый остров
        {
          x: 30,
          y: 385,
          width: 170,
          height: 65,
          type: "island"
        },

        // Платформа 1
        {
          x: 260,
          y: 345,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 2
        {
          x: 430,
          y: 300,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 3
        {
          x: 610,
          y: 255,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 4
        {
          x: 800,
          y: 310,
          width: 130,
          height: 20,
          type: "platform"
        },

        // Платформа 5
        {
          x: 990,
          y: 360,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 6
        {
          x: 1160,
          y: 300,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 7 основного пути
        {
          x: 1340,
          y: 245,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Секретная верхняя развилка....
        {
          x: 1245,
          y: 190,
          width: 86,
          height: 16,
          type: "branch"
        },
        {
          x: 1325,
          y: 145,
          width: 92,
          height: 16,
          type: "branch"
        },
        {
          x: 1435,
          y: 80,
          width: 92,
          height: 16,
          type: "branch"
        },

        // Платформа 8
        {
          x: 1530,
          y: 300,
          width: 130,
          height: 20,
          type: "platform"
        },

        // Платформа 9
        {
          x: 1720,
          y: 355,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 10
        {
          x: 1900,
          y: 300,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 11
        {
          x: 2080,
          y: 245,
          width: 120,
          height: 20,
          type: "platform"
        },

        // Платформа 12
        {
          x: 2270,
          y: 300,
          width: 130,
          height: 20,
          type: "platform"
        },

        // Финишный остров
        {
          x: 2450,
          y: 350,
          width: 180,
          height: 100,
          type: "island"
        }
      ],

      // Три собираемые мини-луны
      items: [
        {
          x: 658,
          y: 130,
          width: 24,
          height: 24,
          collected: false,
          type: "moon"
        },
        {
          x: 1388,
          y: 130,
          width: 24,
          height: 24,
          collected: false,
          type: "moon"
        },
        {
          x: 2128,
          y: 130,
          width: 24,
          height: 24,
          collected: false,
          type: "moon"
        }
      ],

      // Лава на весь пол.
      hazards: [
        {
          x: 0,
          y: lavaY,
          width: levelWidth,
          height: 400,
          type: "lava"
        }
      ],

      // Портал на последнем острове. Активируется после сбора всех лун.
      finish: {
        x: 2540,
        y: 260,
        width: 56,
        height: 90,
        type: "portal"
      },

      // Призрак скрывается на верхней развилке, в стороне от главного пути.
      ghost: {
        x: 1462,
        y: 34,
        width: 34,
        height: 46,
        discovered: false
      }
    };

    this.totalItems = this.level.items.length;

    this.player = new Player(70, 0);

    // Ставим героя на стартовый остров.
    const startIsland = this.level.platforms[0];
    this.player.startX = 70;
    this.player.startY = startIsland.y - this.player.height;
    this.player.reset(this.player.startX, this.player.startY);

    this.bestScore = this.loadBestScore();

    // Пока игра не запущена, ввод не активен.
    this.input.setActive(false);

    this.bindEvents();
    this.updateUI();
    this.render();
  }

  bindEvents() {
    if (this.ui.startBtn) {
      this.ui.startBtn.addEventListener("click", this.onStartClick);
    }

    if (this.ui.pauseBtn) {
      this.ui.pauseBtn.addEventListener("click", this.onPauseClick);
    }

    if (this.ui.resumeBtn) {
      this.ui.resumeBtn.addEventListener("click", this.onResumeClick);
    }

    if (this.ui.restartBtn) {
      this.ui.restartBtn.addEventListener("click", this.onRestartClick);
    }

    // Сенсорное управление.
    this.input.attachTouchControls({
      left: this.ui.leftBtn,
      right: this.ui.rightBtn,
      jump: this.ui.jumpBtn
    });

    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("keydown", this.onGlobalKeyDown);
    window.addEventListener("resize", this.onWindowResize);
    this.canvas.addEventListener("click", this.onCanvasClick);
  }

  resizeCanvas = () => {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width || this.width;
    const cssHeight = rect.height || this.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2.5);

    // Буфер соответствует реальному размеру canvas на экране, а игровая
    // логика продолжает работать в привычных координатах 800×450.
    this.canvas.width = Math.max(1, Math.round(cssWidth * ratio));
    this.canvas.height = Math.max(1, Math.round(cssHeight * ratio));
    this.ctx.setTransform(
      this.canvas.width / this.width, 0,
      0, this.canvas.height / this.height,
      0, 0
    );

    if (this.level) this.render();
  };

  onWindowResize = () => {
    this.resizeCanvas();
  };

  blurTarget(event) {
    if (
      event &&
      event.currentTarget &&
      typeof event.currentTarget.blur === "function"
    ) {
      event.currentTarget.blur();
    }
  }

  onStartClick = (event) => {
    this.blurTarget(event);

    if (this.state === "stopped") {
      this.start();
    } else if (this.state === "paused") {
      this.resume();
    } else if (this.state === "won" || this.state === "lost") {
      this.restart();
    }
  };

  onPauseClick = (event) => {
    this.blurTarget(event);
    this.pause();
  };

  onResumeClick = (event) => {
    this.blurTarget(event);
    this.resume();
  };

  onRestartClick = (event) => {
    this.blurTarget(event);
    this.restart();
  };

  onVisibilityChange = () => {
    if (document.hidden) {
      if (this.state === "running") {
        this.pause();
      }
    } else {
      if (this.autoResumeOnVisible && this.state === "paused") {
        this.resume();
      }
    }
  };

  onGlobalKeyDown = (event) => {
    const tag = event.target && event.target.tagName ? event.target.tagName : "";

    if (tag === "INPUT" || tag === "TEXTAREA") return;

    // Диалог призрака: цифры 1/2 выбирают ответ, Enter подтверждает первый.
    if (this.state === "dialogue") {
      if (event.code === "Digit1" || event.code === "Numpad1") {
        event.preventDefault();
        this.chooseDialogue(1);
        return;
      }
      if (event.code === "Digit2" || event.code === "Numpad2") {
        event.preventDefault();
        this.chooseDialogue(2);
        return;
      }
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault();
        this.chooseDialogue(1);
        return;
      }
      return;
    }

    // Enter:
    // - в stopped запускает игру;
    // - в paused продолжает;
    // - в won/lost перезапускает.
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      // Если фокус на кнопке, пусть кнопка сама обработает Enter.
      if (tag === "BUTTON") return;

      event.preventDefault();

      if (this.state === "paused") {
        this.resume();
      } else if (this.state === "stopped") {
        this.start();
      } else if (this.state === "won" || this.state === "lost") {
        this.restart();
      }
    }

    // R — быстрый рестарт.
    if (event.code === "KeyR") {
      event.preventDefault();

      // Если фокус был на кнопке, убираем его, чтобы потом стрелки работали комфортно.
      if (event.target && typeof event.target.blur === "function") {
        event.target.blur();
      }

      this.restart();
    }

    // Чтобы страница не прокручивалась игровыми клавишами,
    // когда игра не активна.
    const preventWhenInactive = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space"
    ];

    if (
      this.state !== "running" &&
      tag !== "BUTTON" &&
      preventWhenInactive.includes(event.code)
    ) {
      event.preventDefault();
    }
  };

  onCanvasClick = (event) => {
    if (this.state !== "dialogue" || !this.dialogue) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this.width / rect.width);
    const y = (event.clientY - rect.top) * (this.height / rect.height);
    const boxW = Math.min(620, this.width - 48);
    const left = (this.width - boxW) / 2;
    const boxY = this.height - 168;
    const buttonY = boxY + 104;
    const buttonH = 40;
    const gap = 12;
    const buttonW = (boxW - 36 - gap) / 2;
    const first = { x: left + 18, y: buttonY, width: buttonW, height: buttonH };
    const second = { x: first.x + buttonW + gap, y: buttonY, width: buttonW, height: buttonH };

    if (x >= first.x && x <= first.x + first.width && y >= first.y && y <= first.y + first.height) {
      this.chooseDialogue(1);
    } else if (x >= second.x && x <= second.x + second.width && y >= second.y && y <= second.y + second.height) {
      this.chooseDialogue(2);
    }
  };

  chooseDialogue(choice) {
    if (this.state !== "dialogue" || !this.dialogue) return;

    if (this.dialogue.stage === 0) {
      if (choice === 1) {
        this.dialogue = {
          stage: 2,
          title: "Призрак опускает взгляд",
          text: "«Я понимаю, Тогда просто будь осторожен...»",
          options: ["Продолжить путь", "Попрощаться"]
        };
      } else {
        this.dialogue = {
          stage: 1,
          title: "Призрак улыбается",
          text: "*послышался всхлип* Вот как... Никто не пытался со мной подружиться из-за моего грозного вида. Вот тебе подарок от меня как  от друга!»",
          options: ["Забрать талисман дружбы", "Передумать"]
        };
      }
      this.render();
      return;
    }

    if (this.dialogue.stage === 1 && choice === 1) {
      this.score = this.totalItems;
      this.saveBestScore();
      this.dialogue = null;
      this.state = "running";
      this.input.setActive(true);
      this.win("Тайная концовка", "Призрак поделился своей дружбой. Что-то, намного более ценное, чем луны, открыло портал!");
      return;
    }

    // Отказ от подарка или завершение обычной беседы.
    this.dialogue = null;
    this.state = "running";
    this.input.setActive(true);
    this.lastTime = performance.now();
    this.updateUI();
    this.schedule();
    this.render();
  }

  start() {
    if (this.state === "running") return;

    if (this.state === "paused") {
      this.resume();
      return;
    }

    if (this.state === "won" || this.state === "lost") {
      this.restart();
      return;
    }

    this.state = "running";
    this.input.setActive(true);

    this.lastTime = performance.now();

    this.updateUI();
    this.schedule();
  }

  stop() {
    this.cancelLoop();
    this.state = "stopped";

    this.input.clear();
    this.input.setActive(false);

    this.updateUI();
    this.render();
  }

  pause() {
    if (this.state !== "running") return;

    this.cancelLoop();
    this.state = "paused";

    this.input.clear();
    this.input.setActive(false);

    this.updateUI();
    this.render();
  }

  resume() {
    if (this.state !== "paused") return;

    this.state = "running";
    this.input.setActive(true);

    // Важно: сбрасываем время, чтобы после паузы не было рывка.
    this.lastTime = performance.now();

    this.updateUI();
    this.schedule();
  }

  restart() {
    this.cancelLoop();
    this.resetLevel();

    this.state = "stopped";
    this.start();
  }

  resetLevel() {
    this.player.reset(this.player.startX, this.player.startY);

    this.camera.x = 0;
    this.score = 0;
    this.lavaTime = 0;
    this.dialogue = null;
    this.level.ghost.discovered = false;

    this.result.title = "";
    this.result.text = "";

    for (const item of this.level.items) {
      item.collected = false;
    }
  }

  schedule() {
    this.cancelLoop();
    this.rafId = requestAnimationFrame(this.loop);
  }

  cancelLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  loop = (currentTime) => {
    if (this.state !== "running") {
      this.rafId = null;
      return;
    }

    let dt = (currentTime - this.lastTime) / 1000;

    if (!Number.isFinite(dt) || dt < 0) {
      dt = 0;
    }

    // Ограничиваем слишком большой шаг времени.
    dt = Math.min(dt, 0.05);

    this.lastTime = currentTime;

    this.update(dt);

    // Если во время update наступила победа/поражение,
    // не запрашиваем следующий кадр.
    if (this.state !== "running") {
      this.render();
      this.rafId = null;
      return;
    }

    this.render();
    this.schedule();
  };

  update(dt) {
    this.lavaTime += dt;

    this.player.update(dt, this.input, this.level);

    // 1. Поражение при падении.
    if (this.player.fallen) {
      this.lose("Поражение", "Кот упал в лаву.");
      return;
    }

    // 2. Поражение при касании опасности.
    for (const hazard of this.level.hazards) {
      if (rectsIntersect(this.player, hazard)) {
        this.lose("Поражение", "Кот коснулся лавы.");
        return;
      }
    }

    // 3. Сбор предметов.
    for (const item of this.level.items) {
      if (!item.collected && rectsIntersect(this.player, item)) {
        item.collected = true;
        this.score += 1;

        this.saveBestScore();
        this.updateUI();
      }
    }

    // 4. Секретная встреча на верхней развилке.
    const ghost = this.level.ghost;
    if (!ghost.discovered && rectsIntersect(this.player, ghost)) {
      ghost.discovered = true;
      this.state = "dialogue";
      this.dialogue = {
        stage: 0,
        title: "Хмурое существо",
        text: "«Кто ты?» Голос звучит сердито, но в нём слышится одиночество.",
        options: ["Да так, никто, мимо проходил…", "Я твой будущий друг!"]
      };
      this.input.clear();
      this.input.setActive(false);
      this.updateUI();
      this.render();
      return;
    }

    // 5. Победа: все предметы собраны + вход в открытый портал.
    if (
      this.score === this.totalItems &&
      rectsIntersect(this.player, this.level.finish)
    ) {
      this.win("Победа", "Кот собрал все луны и прошёл сквозь портал домой!");
      return;
    }

    this.updateCamera(dt);
  }

  win(title, text) {
    if (this.state !== "running") return;

    this.cancelLoop();
    this.state = "won";

    this.result.title = title;
    this.result.text = text;

    this.input.clear();
    this.input.setActive(false);

    this.saveBestScore();
    this.updateUI();
    this.render();
  }

  lose(title, text) {
    if (this.state !== "running") return;

    this.cancelLoop();
    this.state = "lost";

    this.result.title = title;
    this.result.text = text;

    this.input.clear();
    this.input.setActive(false);

    this.saveBestScore();
    this.updateUI();
    this.render();
  }

  loadBestScore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw === null) return 0;

      const value = Number(raw);

      if (!Number.isFinite(value) || value < 0) {
        return 0;
      }

      return Math.min(Math.floor(value), this.totalItems);
    } catch (error) {
      // Если localStorage недоступен, просто играем без сохранения рекорда.
      return 0;
    }
  }

  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;

      try {
        localStorage.setItem(STORAGE_KEY, String(this.bestScore));
      } catch (error) {
        // Игнорируем ошибки хранения: например, приватный режим браузера.
      }
    }
  }

  updateCamera(dt) {
    const targetX =
      this.player.x + this.player.width / 2 - this.width / 2;

    const maxCameraX = Math.max(0, this.level.width - this.width);

    const clampedTargetX = Math.max(0, Math.min(targetX, maxCameraX));

    // Плавное движение камеры.
    const smoothing = 1 - Math.pow(0.001, dt * 8);
    this.camera.x += (clampedTargetX - this.camera.x) * smoothing;

    if (Math.abs(clampedTargetX - this.camera.x) < 0.5) {
      this.camera.x = clampedTargetX;
    }

    this.camera.y = 0;
  }

  updateUI() {
    const stateMap = {
      stopped: "остановлено",
      running: "играет",
      paused: "пауза",
      won: "победа",
      lost: "поражение",
      dialogue: "встреча с призраком"
    };

    const stateText = stateMap[this.state] || this.state;

    if (this.ui.stateEl) {
      this.ui.stateEl.textContent = `Состояние: ${stateText}`;
    }

    if (this.ui.fishEl) {
      this.ui.fishEl.textContent = `Луны: ${this.score}/${this.totalItems}`;
    }

    if (this.ui.bestEl) {
      this.ui.bestEl.textContent = `Рекорд: ${this.bestScore}/${this.totalItems}`;
    }

    if (this.ui.startBtn) {
      this.ui.startBtn.disabled = this.state !== "stopped";
    }

    if (this.ui.pauseBtn) {
      this.ui.pauseBtn.disabled = this.state !== "running";
    }

    if (this.ui.resumeBtn) {
      this.ui.resumeBtn.disabled = this.state !== "paused";
    }

    if (this.ui.restartBtn) {
      this.ui.restartBtn.disabled = false;
    }
  }

  render() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawSunsetBackground(ctx);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), 0);

    // Сначала лава, потом островки/платформы, чтобы они были над лавой
    this.drawHazards(ctx);
    this.drawPlatforms(ctx);
    this.drawItems(ctx);
    this.drawGhost(ctx);
    this.drawFinish(ctx);
    this.player.draw(ctx);

    ctx.restore();

    // Информационная плашка внутри canvas убрана.
    // Остаются только полноэкранные состояния: старт / пауза / победа / поражение
    this.drawOverlay(ctx);
    this.drawDialogue(ctx);
  }

  drawSunsetBackground(ctx) {
    const w = this.width;
    const h = this.height;

    // Глубокое космическое небо с холодным свечением у горизонта
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#070b1e");
    sky.addColorStop(0.42, "#15183d");
    sky.addColorStop(0.72, "#29214f");
    sky.addColorStop(1, "#542c66");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Звёзды закреплены в экранном пространстве, чтобы не дрожали при движении камеры
    for (let i = 0; i < 72; i++) {
      const x = (i * 127.7 + 31) % w;
      const y = (i * 71.3 + 17) % (h * 0.78);
      const r = i % 9 === 0 ? 1.5 : (i % 3 === 0 ? 1 : 0.65);
      const twinkle = 0.35 + (Math.sin(this.lavaTime * 1.2 + i) + 1) * 0.25;
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = i % 5 === 0 ? "#b7c9ff" : "#fff5dc";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Большая луна на заднем плане
    const moonX = w * 0.78;
    const moonY = h * 0.24;
    const moonR = h * 0.105;
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.3, moonX, moonY, moonR * 2.5);
    halo.addColorStop(0, "rgba(186, 205, 255, 0.25)");
    halo.addColorStop(1, "rgba(145, 160, 255, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const lunarDisc = ctx.createLinearGradient(moonX - moonR, moonY - moonR, moonX + moonR, moonY + moonR);
    lunarDisc.addColorStop(0, "#fff6df");
    lunarDisc.addColorStop(0.55, "#d9e2ff");
    lunarDisc.addColorStop(1, "#9eacd9");
    ctx.fillStyle = lunarDisc;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Небольшие кратеры на дальней луне
    ctx.fillStyle = "rgba(93, 111, 160, 0.20)";
    [[-0.35, -0.12, 0.12], [0.22, 0.25, 0.17], [0.38, -0.28, 0.07]].forEach(([dx, dy, rr]) => {
      ctx.beginPath();
      ctx.arc(moonX + dx * moonR, moonY + dy * moonR, rr * moonR, 0, Math.PI * 2);
      ctx.fill();
    });

    this.drawParallaxHills(ctx, this.camera.x);
  }

  drawParallaxHills(ctx, cameraX) {
    const w = this.width;
    const h = this.height;

    const layers = [
      {
        parallax: 0.16,
        baseY: h * 0.70,
        amplitude: 28,
        frequency: 0.0055,
        color: "rgba(65, 78, 132, 0.48)"
      },
      {
        parallax: 0.32,
        baseY: h * 0.79,
        amplitude: 20,
        frequency: 0.0085,
        color: "rgba(13, 18, 48, 0.78)"
      }
    ];

    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, h);

      const offset = cameraX * layer.parallax;

      for (let x = 0; x <= w; x += 16) {
        const worldX = x + offset;

        const y =
          layer.baseY +
          Math.sin(worldX * layer.frequency) * layer.amplitude +
          Math.sin(worldX * layer.frequency * 2.2 + 1.4) * layer.amplitude * 0.35;

        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawHazards(ctx) {
    for (const h of this.level.hazards) {
      const lavaY = h.y;
      const lavaBottom = this.height;
      const lavaWidth = h.width;
      const step = 14;

      // Мягкое свечение над лавой
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(this.lavaTime * 2) * 0.04;
      ctx.fillStyle = "#9f5bff";
      ctx.fillRect(h.x, lavaY - 24, lavaWidth, 24);
      ctx.restore();

      // Основная лава.
      const lavaGradient = ctx.createLinearGradient(0, lavaY, 0, lavaBottom);
      lavaGradient.addColorStop(0, "#b16cff");
      lavaGradient.addColorStop(0.18, "#793cff");
      lavaGradient.addColorStop(0.55, "#4421a8");
      lavaGradient.addColorStop(1, "#120d36");

      ctx.fillStyle = lavaGradient;
      ctx.fillRect(h.x, lavaY, lavaWidth, lavaBottom - lavaY);

      // Анимированная поверхность лавы
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(h.x, lavaBottom);

      for (let x = h.x; x <= h.x + lavaWidth; x += step) {
        const wave =
          Math.sin(x * 0.018 + this.lavaTime * 2.1) * 4 +
          Math.sin(x * 0.043 + this.lavaTime * 3.4) * 2;

        ctx.lineTo(x, lavaY + 6 + wave);
      }

      ctx.lineTo(h.x + lavaWidth, lavaBottom);
      ctx.closePath();

      const surfaceGradient = ctx.createLinearGradient(0, lavaY, 0, lavaY + 22);
      surfaceGradient.addColorStop(0, "rgba(190, 220, 255, 0.95)");
      surfaceGradient.addColorStop(0.45, "rgba(151, 104, 255, 0.75)");
      surfaceGradient.addColorStop(1, "rgba(68, 33, 168, 0.0)");

      ctx.fillStyle = surfaceGradient;
      ctx.fill();
      ctx.restore();

      // Яркая кромка лавы
      ctx.strokeStyle = "rgba(197, 179, 255, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = h.x; x <= h.x + lavaWidth; x += step) {
        const wave =
          Math.sin(x * 0.018 + this.lavaTime * 2.1) * 4 +
          Math.sin(x * 0.043 + this.lavaTime * 3.4) * 2;

        const y = lavaY + 6 + wave;

        if (x === h.x) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Пузырьки лавы
      ctx.fillStyle = "rgba(213, 221, 255, 0.55)";

      for (let x = h.x + 20; x < h.x + lavaWidth; x += 90) {
        const seed = x * 0.01;
        const bubbleY =
          lavaY + 12 + ((Math.sin(seed + this.lavaTime * 2.5) + 1) * 10);
        const radius = 2 + (Math.sin(seed * 3.1) + 1) * 1.5;

        ctx.beginPath();
        ctx.arc(x, bubbleY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPlatforms(ctx) {
    for (const p of this.level.platforms) {
      if (p.type === "island") {
        // Тень острова.
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.fillRect(p.x + 4, p.y + 6, p.width, p.height);

        // Каменная основа острова
        ctx.fillStyle = "#252b4b";
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Более светлая внутренняя часть
        ctx.fillStyle = "#343b61";
        ctx.fillRect(p.x + 4, p.y + 4, p.width - 8, p.height - 4);

        // Верх острова
        ctx.fillStyle = "#8da5d9";
        ctx.fillRect(p.x, p.y, p.width, 12);

        // Тёплый блик сверху
        ctx.fillStyle = "rgba(190, 220, 255, 0.55)";
        ctx.fillRect(p.x, p.y, p.width, 3);

        // Рамка
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
      } else {
        // Тень платформы
        ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
        ctx.fillRect(p.x + 3, p.y + 4, p.width, p.height);

        // Основа платформы
        ctx.fillStyle = "#303655";
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Тёплая верхняя кромка
        ctx.fillStyle = "#a8c7ff";
        ctx.fillRect(p.x, p.y, p.width, 4);

        // Рамка
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
      }
    }
  }

  drawItems(ctx) {
    for (const item of this.level.items) {
      if (item.collected) continue;

      const bob = Math.sin(this.lavaTime * 2.4 + item.x * 0.02) * 4;
      const pulse = 1 + Math.sin(this.lavaTime * 3 + item.x) * 0.05;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2 + bob;
      const r = item.width * 0.46 * pulse;

      ctx.save();

      // Мягкий ореол
      const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
      glow.addColorStop(0, "rgba(208, 226, 255, 0.72)");
      glow.addColorStop(0.45, "rgba(142, 177, 255, 0.22)");
      glow.addColorStop(1, "rgba(142, 177, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Миниатюрная луна с объёмным холодным градиентом
      const disc = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      disc.addColorStop(0, "#ffffff");
      disc.addColorStop(0.48, "#dce8ff");
      disc.addColorStop(1, "#8296cc");
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Кратеры
      ctx.fillStyle = "rgba(91, 112, 165, 0.42)";
      [[-0.32, -0.08, 0.17], [0.22, 0.25, 0.12], [0.32, -0.28, 0.08]].forEach(([dx, dy, size]) => {
        ctx.beginPath();
        ctx.arc(cx + dx * r, cy + dy * r, size * r * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Тонкая светлая кромка
      ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

   drawFinish(ctx) {
    const f = this.level.finish;
    const unlocked = this.score === this.totalItems;
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, 64);
    halo.addColorStop(0, unlocked ? "rgba(144,255,229,0.34)" : "rgba(134,145,190,0.14)");
    halo.addColorStop(1, "rgba(134,145,190,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = unlocked ? "#9fffe0" : "#66708f";
    ctx.shadowColor = unlocked ? "#7affdf" : "#7c83b0";
    ctx.shadowBlur = unlocked ? 24 : 7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 23, 39, 0, 0, Math.PI * 2);
    ctx.stroke();
    const portal = ctx.createLinearGradient(cx - 20, cy, cx + 20, cy);
    portal.addColorStop(0, unlocked ? "rgba(96,130,255,0.85)" : "rgba(66,75,112,0.6)");
    portal.addColorStop(0.5, unlocked ? "rgba(205,255,247,0.9)" : "rgba(105,112,150,0.65)");
    portal.addColorStop(1, unlocked ? "rgba(190,139,255,0.85)" : "rgba(66,75,112,0.6)");
    ctx.fillStyle = portal;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 17, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = unlocked ? 0.9 : 0.45;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 11 + Math.sin(this.lavaTime * 2) * 2, 26, this.lavaTime * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.font = "700 12px Jura, sans-serif"; // <-- JURA
    ctx.fillStyle = unlocked ? "#b9ffed" : "#aab2d0";
    ctx.fillText(unlocked ? "ПОРТАЛ ОТКРЫТ" : `ЛУНЫ ${this.score}/${this.totalItems}`, cx, f.y - 14);
    if (!unlocked) {
      ctx.font = "500 10px Jura, sans-serif"; // <-- JURA
      ctx.fillStyle = "rgba(220,225,255,0.72)";
      ctx.fillText("СОБЕРИ ВСЕ", cx, f.y - 2);
    }
    ctx.restore();
  }


drawGhost(ctx) {
    const g = this.level.ghost;
    if (g.discovered) return;
    const bob = Math.sin(this.lavaTime * 1.7) * 5;
    const x = g.x;
    const y = g.y + bob;
    const cx = x + g.width / 2;
    const cy = y + g.height / 2;
    ctx.save();
    ctx.globalAlpha = 0.92;
    
    // Тёмно-фиолетовая аура с красноватым оттенком
    const aura = ctx.createRadialGradient(cx, cy, 2, cx, cy, 48);
    aura.addColorStop(0, "rgba(180, 60, 90, 0.38)");
    aura.addColorStop(0.5, "rgba(120, 40, 140, 0.22)");
    aura.addColorStop(1, "rgba(80, 20, 100, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fill();
    
    // Тело призрака
    ctx.fillStyle = "#4a3a5e";
    ctx.shadowColor = "#8b3a6a";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(cx - 14, y + 8);
    ctx.lineTo(cx - 18, y - 2);
    ctx.lineTo(cx - 10, y + 4);
    ctx.lineTo(cx - 4, y + 2);
    ctx.lineTo(cx, y);
    ctx.lineTo(cx + 4, y + 2);
    ctx.lineTo(cx + 10, y + 4);
    ctx.lineTo(cx + 18, y - 2);
    ctx.lineTo(cx + 14, y + 8);
    ctx.lineTo(cx + 18, y + 20);
    ctx.lineTo(cx + 16, y + 32);
    ctx.lineTo(cx + 10, y + 28);
    ctx.lineTo(cx + 6, y + 36);
    ctx.lineTo(cx, y + 30);
    ctx.lineTo(cx - 6, y + 36);
    ctx.lineTo(cx - 10, y + 28);
    ctx.lineTo(cx - 16, y + 32);
    ctx.lineTo(cx - 18, y + 20);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = "rgba(30, 15, 40, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, y + 12);
    ctx.lineTo(cx - 6, y + 22);
    ctx.moveTo(cx + 7, y + 14);
    ctx.lineTo(cx + 9, y + 24);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Злые глаза
    const eyeGlow = ctx.createRadialGradient(cx - 6, y + 16, 0, cx - 6, y + 16, 6);
    eyeGlow.addColorStop(0, "rgba(255, 80, 60, 0.9)");
    eyeGlow.addColorStop(0.5, "rgba(200, 40, 50, 0.6)");
    eyeGlow.addColorStop(1, "rgba(150, 20, 40, 0)");
    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(cx - 6, y + 16, 6, 0, Math.PI * 2);
    ctx.fill();
    
    const eyeGlow2 = ctx.createRadialGradient(cx + 6, y + 16, 0, cx + 6, y + 16, 6);
    eyeGlow2.addColorStop(0, "rgba(255, 80, 60, 0.9)");
    eyeGlow2.addColorStop(0.5, "rgba(200, 40, 50, 0.6)");
    eyeGlow2.addColorStop(1, "rgba(150, 20, 40, 0)");
    ctx.fillStyle = eyeGlow2;
    ctx.beginPath();
    ctx.arc(cx + 6, y + 16, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#ff3030";
    ctx.beginPath();
    ctx.ellipse(cx - 6, y + 16, 2.2, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 6, y + 16, 2.2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#ffaaaa";
    ctx.fillRect(cx - 6.5, y + 15, 1.5, 2);
    ctx.fillRect(cx + 5.5, y + 15, 1.5, 2);
    
    // Оскал
    ctx.strokeStyle = "#2a1a35";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, y + 24);
    ctx.lineTo(cx - 4, y + 26);
    ctx.lineTo(cx, y + 23);
    ctx.lineTo(cx + 4, y + 26);
    ctx.lineTo(cx + 8, y + 24);
    ctx.stroke();
    
    ctx.fillStyle = "#d4c4e0";
    ctx.beginPath();
    ctx.moveTo(cx - 5, y + 24);
    ctx.lineTo(cx - 4, y + 27);
    ctx.lineTo(cx - 3, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 3, y + 24);
    ctx.lineTo(cx + 4, y + 27);
    ctx.lineTo(cx + 5, y + 24);
    ctx.closePath();
    ctx.fill();
    
    // Предупреждающая надпись при приближении (ШРИФТ CAVEAT)
    if (Math.abs((this.player.x + this.player.width / 2) - cx) < 120 &&
        Math.abs((this.player.y + this.player.height / 2) - cy) < 100) {
      ctx.fillStyle = "rgba(10, 5, 15, 0.88)";
      ctx.strokeStyle = "rgba(200, 60, 80, 0.65)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(cx - 75, y - 32, 150, 28, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff9999";
      ctx.font = "700 22px Caveat, cursive"; // <-- Рукописный шрифт для реплики
      ctx.textAlign = "center";
      ctx.fillText("Уходи... пока цел...", cx, y - 11);
    }
    
    ctx.restore();
  }

   drawDialogue(ctx) {
    if (this.state !== "dialogue" || !this.dialogue) return;
    const w = this.width;
    const h = this.height;
    const boxW = Math.min(620, w - 48);
    const boxH = 165; // Чуть выше для рукописного текста
    const x = (w - boxW) / 2;
    const y = h - boxH - 12;
    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 25, 0.90)";
    ctx.strokeStyle = "rgba(178, 194, 255, 0.72)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();
    
    // Заголовок (ШРИФТ JURA)
    ctx.fillStyle = "#c7d2ff";
    ctx.font = "700 16px Jura, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(this.dialogue.title, x + 18, y + 26);
    
    // Текст реплики (ШРИФТ CAVEAT)
    ctx.fillStyle = "rgba(245,247,255,0.95)";
    ctx.font = "400 21px Caveat, cursive"; // <-- Рукописный шрифт для реплики
    const text = this.dialogue.text;
    const maxChars = Math.max(36, Math.floor((boxW - 36) / 10)); // Подстроили под ширину Caveat
    const words = text.split(" ");
    let line = "";
    let lineY = y + 56;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (test.length > maxChars && line) {
        ctx.fillText(line, x + 18, lineY);
        line = word;
        lineY += 26; // Увеличенный интервал для читаемости
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x + 18, lineY);
    
    // Кнопки (ШРИФТ JURA)
    const buttonY = y + 112;
    const gap = 12;
    const buttonW = (boxW - 36 - gap) / 2;
    const labels = this.dialogue.options || ["Продолжить", "Закрыть"];
    for (let i = 0; i < 2; i++) {
      const bx = x + 18 + i * (buttonW + gap);
      ctx.fillStyle = i === 1 ? "rgba(123,135,190,0.18)" : "rgba(127,244,222,0.15)";
      ctx.strokeStyle = i === 1 ? "rgba(160,172,230,0.52)" : "rgba(127,244,222,0.72)";
      ctx.beginPath();
      ctx.roundRect(bx, buttonY, buttonW, 40, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f4f6ff";
      ctx.font = "600 12px Jura, sans-serif"; // <-- Основной шрифт
      ctx.textAlign = "center";
      ctx.fillText(`${i + 1}. ${labels[i]}`, bx + buttonW / 2, buttonY + 24, buttonW - 12);
    }
    
    // Подсказка (ШРИФТ JURA)
    ctx.fillStyle = "rgba(220,226,255,0.55)";
    ctx.font = "400 10px Jura, sans-serif"; // <-- Основной шрифт
    ctx.textAlign = "right";
    ctx.fillText("Нажми 1 / 2 или выбери вариант мышью", x + boxW - 18, y + boxH - 8);
    ctx.restore();
  }


   drawOverlay(ctx) {
    if (this.state === "running" || this.state === "dialogue") return;
    const w = this.width;
    const h = this.height;
    ctx.save();
    
    if (this.state === "won") {
      ctx.fillStyle = "rgba(8, 35, 20, 0.78)";
    } else if (this.state === "lost") {
      ctx.fillStyle = "rgba(45, 8, 20, 0.80)";
    } else if (this.state === "paused") {
      ctx.fillStyle = "rgba(4, 4, 4, 0.72)";
    } else {
      ctx.fillStyle = "rgba(4, 4, 4, 0.82)";
    }
    
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Проверяем, является ли это секретной концовкой
    const isSecretEnding = this.result.title === "Тайная концовка";
    // Если да, то "собрано" 10000 лун
    const displayScore = isSecretEnding ? 10000 : this.score;
    const displayBest = isSecretEnding ? 10000 : this.bestScore;

    if (this.state === "won") {
      ctx.fillStyle = "#b9fbc0";
      ctx.font = "700 40px Jura, sans-serif";
      ctx.fillText("Победа!", w / 2, h / 2 - 62);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.font = "400 17px Jura, sans-serif";
      ctx.fillText(this.result.text, w / 2, h / 2 - 18);
      
      ctx.fillText(`Собрано лун: ${displayScore}/${this.totalItems}`, w / 2, h / 2 + 12);
      ctx.fillText(`Рекорд: ${displayBest}/${this.totalItems}`, w / 2, h / 2 + 40);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
      ctx.font = "400 15px Jura, sans-serif";
      ctx.fillText("Нажми «Заново» или R, чтобы сыграть ещё раз.", w / 2, h / 2 + 76);
      
    } else if (this.state === "lost") {
      ctx.fillStyle = "#ffccd5";
      ctx.font = "700 40px Jura, sans-serif";
      ctx.fillText("Поражение", w / 2, h / 2 - 62);
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.font = "400 17px Jura, sans-serif";
      ctx.fillText(this.result.text, w / 2, h / 2 - 18);
      ctx.fillText(`Собрано лун: ${this.score}/${this.totalItems}`, w / 2, h / 2 + 12);
      ctx.fillText(`Рекорд: ${this.bestScore}/${this.totalItems}`, w / 2, h / 2 + 40);
      ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
      ctx.font = "400 15px Jura, sans-serif";
      ctx.fillText("Нажми «Заново» или R, чтобы попробовать снова.", w / 2, h / 2 + 76);
    } else if (this.state === "paused") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 34px Jura, sans-serif";
      ctx.fillText("Пауза", w / 2, h / 2 - 34);
      ctx.font = "400 16px Jura, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.fillText("Вкладка была скрыта, поэтому игра остановилась.", w / 2, h / 2 + 4);
      ctx.fillText("Нажми «Продолжить» или Enter.", w / 2, h / 2 + 32);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 34px Jura, sans-serif";
      ctx.fillText("Платформер готов", w / 2, h / 2 - 54);
      ctx.font = "400 16px Jura, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.fillText("Нажми «Старт» или Enter, чтобы начать.", w / 2, h / 2 - 14);
      ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
      ctx.font = "400 14px Jura, sans-serif";
      ctx.fillText("Клавиатура: стрелки / A D — движение, Space / W — прыжок.", w / 2, h / 2 + 16);
      ctx.fillText("Телефон: кнопки слева и прыжок справа.", w / 2, h / 2 + 40);
      ctx.fillText("Собери 3 луны и открой портал.", w / 2, h / 2 + 64);
    }
    ctx.restore();
  }
  destroy() {
    this.stop();

    if (this.ui.startBtn) {
      this.ui.startBtn.removeEventListener("click", this.onStartClick);
    }

    if (this.ui.pauseBtn) {
      this.ui.pauseBtn.removeEventListener("click", this.onPauseClick);
    }

    if (this.ui.resumeBtn) {
      this.ui.resumeBtn.removeEventListener("click", this.onResumeClick);
    }

    if (this.ui.restartBtn) {
      this.ui.restartBtn.removeEventListener("click", this.onRestartClick);
    }

    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("keydown", this.onGlobalKeyDown);
    this.canvas.removeEventListener("click", this.onCanvasClick);
  }
}