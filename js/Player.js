import { resolveHorizontal, resolveVertical } from "./collision.js";

export default class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;

    this.width = 34;
    this.height = 48;
    this.color = "#10152d";

    // Скорость в пикселях в секунду
    this.speed = 240;

    // Гравитация
    this.gravity = 1500;

    // Прыжок вверх
    this.jumpVelocity = -560;

    this.reset(x, y);
  }

  reset(x = this.startX, y = this.startY) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.fallen = false;
  }

  update(dt, input, level) {
    const left = input.isDown("ArrowLeft", "KeyA");
    const right = input.isDown("ArrowRight", "KeyD");

    let vx = 0;

    if (left) {
      vx = -this.speed;
      this.facing = -1;
    }

    if (right) {
      vx = this.speed;
      this.facing = 1;
    }

    // -----------------------
    // Горизонтальное движение
    // -----------------------

    const prevX = this.x;
    const horizontal = resolveHorizontal(
      this,
      prevX,
      this.x + vx * dt,
      level.platforms
    );

    this.x = horizontal.x;

    // Не выходим за границы уровня
    if (this.x < 0) {
      this.x = 0;
    }

    if (this.x + this.width > level.width) {
      this.x = level.width - this.width;
    }

    // -----------------------
    // Вертикальное движение
    // -----------------------

    this.vy += this.gravity * dt;

    const prevY = this.y;
    const vertical = resolveVertical(
      this,
      prevY,
      this.y + this.vy * dt,
      level.platforms
    );

    this.y = vertical.y;
    this.vy = vertical.vy;
    this.onGround = vertical.onGround;

    // Поражение обработает Game.js.
    if (this.y > level.height + 200) {
      this.fallen = true;
    }

    // -----------------------
    // Прыжок
    // -----------------------

    const wantJump = input.takeJump();

    if (wantJump && this.onGround) {
      this.vy = this.jumpVelocity;
      this.onGround = false;
    }
  }

  draw(ctx) {
    const x = this.x;
    const y = this.y;
    const width = this.width;
    const height = this.height;


    const dir = this.facing === 1 ? 1 : -1;
    const tailBaseX = x + width / 2 + dir * 10;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#7185d0";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tailBaseX, y + 36);
    ctx.bezierCurveTo(
      tailBaseX + dir * 13, y + 35,
      tailBaseX + dir * 15, y + 23,
      tailBaseX + dir * 8, y + 20
    );
    ctx.bezierCurveTo(
      tailBaseX + dir * 1, y + 17,
      tailBaseX + dir * 8, y + 8,
      tailBaseX + dir * 14, y + 10
    );
    ctx.stroke();

    // Хвостик
    ctx.fillStyle = "#9ba9f0";
    ctx.beginPath();
    ctx.arc(tailBaseX + dir * 14, y + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Тень под силуэтом
    ctx.fillStyle = "rgba(0, 0, 0, 0.20)";
    ctx.beginPath();
    ctx.ellipse(x + width / 2 + 2, y + height - 1, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Лапки
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 42, 7, 5, -0.12, 0, Math.PI * 2);
    ctx.ellipse(x + 24, y + 42, 7, 5, 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Основное тело
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 15);
    ctx.quadraticCurveTo(x + 7, y + 8, x + 13, y + 8);
    ctx.lineTo(x + 21, y + 8);
    ctx.quadraticCurveTo(x + 29, y + 9, x + 29, y + 17);
    ctx.lineTo(x + 30, y + 35);
    ctx.quadraticCurveTo(x + 30, y + 41, x + 24, y + 41);
    ctx.lineTo(x + 10, y + 41);
    ctx.quadraticCurveTo(x + 4, y + 40, x + 4, y + 34);
    ctx.closePath();
    ctx.fill();

    // Голова
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + 15, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ушки
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 12);
    ctx.quadraticCurveTo(x + 2, y + 7, x + 5, y + 1);
    ctx.quadraticCurveTo(x + 6, y - 1, x + 8, y + 2);
    ctx.lineTo(x + 14, y + 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 8);
    ctx.lineTo(x + 26, y + 2);
    ctx.quadraticCurveTo(x + 29, y - 1, x + 30, y + 3);
    ctx.lineTo(x + 32, y + 12);
    ctx.closePath();
    ctx.fill();

    // Внутренняя часть ушек
    ctx.fillStyle = "#b7c8ff";
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 8);
    ctx.lineTo(x + 6, y + 4);
    ctx.lineTo(x + 11, y + 9);
    ctx.quadraticCurveTo(x + 8, y + 8, x + 6, y + 8);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 24, y + 9);
    ctx.lineTo(x + 28, y + 4);
    ctx.lineTo(x + 28, y + 9);
    ctx.closePath();
    ctx.fill();

    // Светлая грудка
    ctx.fillStyle = "rgba(183, 200, 255, 0.18)";
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + 31, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Большие глаза
    const eyeShift = this.facing === 1 ? 1 : -1;
    ctx.fillStyle = "#b8ffe9";
    ctx.beginPath();
    ctx.ellipse(x + 11 + eyeShift, y + 15, 3.2, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 23 + eyeShift, y + 15, 3.2, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Зрачки и блики
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(x + 12 + eyeShift, y + 16, 1.4, 2.7, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 24 + eyeShift, y + 16, 1.4, 2.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + 11 + eyeShift, y + 13.5, 1, 0, Math.PI * 2);
    ctx.arc(x + 23 + eyeShift, y + 13.5, 1, 0, Math.PI * 2);
    ctx.fill();

    // Нос и улыбка
    ctx.fillStyle = "#a9bfff";
    ctx.beginPath();
    ctx.moveTo(x + 15 + eyeShift, y + 21);
    ctx.quadraticCurveTo(x + 17 + eyeShift, y + 20, x + 19 + eyeShift, y + 21);
    ctx.lineTo(x + 17 + eyeShift, y + 23.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(202, 218, 255, 0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 17 + eyeShift, y + 23);
    ctx.quadraticCurveTo(x + 16 + eyeShift, y + 26, x + 13 + eyeShift, y + 25);
    ctx.moveTo(x + 17 + eyeShift, y + 23);
    ctx.quadraticCurveTo(x + 18 + eyeShift, y + 26, x + 21 + eyeShift, y + 25);
    ctx.stroke();

    // Усы тонкие и слегка изогнутые
    ctx.strokeStyle = "rgba(202, 218, 255, 0.65)";
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 23);
    ctx.quadraticCurveTo(x + 5, y + 21, x + 2, y + 20);
    ctx.moveTo(x + 10, y + 25);
    ctx.quadraticCurveTo(x + 5, y + 26, x + 2, y + 27);
    ctx.moveTo(x + 24, y + 23);
    ctx.quadraticCurveTo(x + 29, y + 21, x + 32, y + 20);
    ctx.moveTo(x + 24, y + 25);
    ctx.quadraticCurveTo(x + 29, y + 26, x + 32, y + 27);
    ctx.stroke();
  }
}
